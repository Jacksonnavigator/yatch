from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel
from typing import List, Optional
import io, os, uuid, aiofiles
from PIL import Image as PILImage
from core.database import get_db
from core.security import get_current_user, require_owner
from core.config import get_settings
from models.booking import Yacht, Pricing, BlockedDate, Extra
from datetime import date

router = APIRouter(prefix="/api/yacht", tags=["yacht"])
settings = get_settings()


class PricingUpdate(BaseModel):
    full_day: float
    half_day: float
    hourly: float
    daily_multi: float

    @classmethod
    def _non_negative(cls, v: float) -> float:
        if v is None:
            return v
        if v < 0:
            raise ValueError("Price cannot be negative")
        return v

    # Pydantic v2
    from pydantic import field_validator as _fv

    @_fv("full_day", "half_day", "hourly", "daily_multi")
    @classmethod
    def _validate_prices(cls, v: float) -> float:
        return cls._non_negative(v)


class YachtUpdate(BaseModel):
    name: Optional[str] = None
    model: Optional[str] = None
    length_ft: Optional[int] = None
    max_guests: Optional[int] = None
    description: Optional[str] = None
    location: Optional[str] = None
    amenities: Optional[List[str]] = None


class BlockDateRequest(BaseModel):
    date: date
    reason: Optional[str] = None


class ExtraCreate(BaseModel):
    key: str
    name: str
    description: str
    price: float
    icon: str = "⭐"


def _yacht_dict(yacht: Yacht, *, base_url: str | None = None) -> dict:
    def _abs(url: str | None) -> str | None:
        if not url:
            return url
        if base_url and url.startswith("/uploads/"):
            return f"{base_url}{url}"
        return url

    # Convert relative /uploads/... URLs to absolute so images load when
    # frontend and backend are on different domains (e.g. Render static vs API).
    _images = [(u and _abs(u)) or u for u in (yacht.images or [])]
    _videos = [(u and _abs(u)) or u for u in (yacht.videos or [])]

    return {
        "id": yacht.id,
        "name": yacht.name,
        "model": yacht.model,
        "length_ft": yacht.length_ft,
        "max_guests": yacht.max_guests,
        "description": yacht.description,
        "location": yacht.location,
        "amenities": yacht.amenities or [],
        "images": _images,
        "videos": _videos,
        "featured_image": _abs(yacht.featured_image),
        "featured_video": _abs(yacht.featured_video),
        "pricing": {
            "full_day": yacht.pricing.full_day if yacht.pricing else 3200,
            "half_day": yacht.pricing.half_day if yacht.pricing else 1800,
            "hourly": yacht.pricing.hourly if yacht.pricing else 450,
            "daily_multi": yacht.pricing.daily_multi if yacht.pricing else 2800,
        } if yacht.pricing else None,
        "blocked_dates": [str(b.date) for b in yacht.blocked_dates],
    }


@router.get("/")
def get_yacht(request: Request, db: Session = Depends(get_db)):
    yacht = db.query(Yacht).first()
    if not yacht:
        raise HTTPException(status_code=404, detail="Yacht not found")
    base_url = str(request.base_url).rstrip("/")
    return _yacht_dict(yacht, base_url=base_url)


@router.put("/", dependencies=[Depends(require_owner)])
def update_yacht(request: Request, data: YachtUpdate, db: Session = Depends(get_db)):
    yacht = db.query(Yacht).first()
    for field, val in data.dict(exclude_none=True).items():
        setattr(yacht, field, val)
    db.commit()
    db.refresh(yacht)
    base_url = str(request.base_url).rstrip("/")
    return _yacht_dict(yacht, base_url=base_url)


@router.put("/pricing", dependencies=[Depends(require_owner)])
def update_pricing(data: PricingUpdate, db: Session = Depends(get_db)):
    yacht = db.query(Yacht).first()
    if not yacht.pricing:
        p = Pricing(yacht_id=yacht.id, **data.dict())
        db.add(p)
    else:
        for field, val in data.dict().items():
            setattr(yacht.pricing, field, val)
    db.commit()
    return {"message": "Pricing updated", **data.dict()}


def _upload_to_cloudinary(content: bytes, public_id: str, resource_type: str = "image") -> str:
    """Upload to Cloudinary. Returns secure_url. Requires CLOUDINARY_URL env."""
    import cloudinary.uploader
    cld_url = get_settings().CLOUDINARY_URL
    if not cld_url:
        raise RuntimeError("CLOUDINARY_URL not set")
    os.environ["CLOUDINARY_URL"] = cld_url
    result = cloudinary.uploader.upload(
        io.BytesIO(content),
        public_id=public_id,
        resource_type=resource_type,
        overwrite=True,
    )
    return result["secure_url"]


@router.post("/images", dependencies=[Depends(require_owner)])
async def upload_image(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if file.content_type not in settings.allowed_image_types_list:
        raise HTTPException(status_code=400, detail="Invalid file type")
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large (max {settings.MAX_FILE_SIZE_MB}MB)")
    yacht = db.query(Yacht).first()
    base_url = str(request.base_url).rstrip("/")

    if settings.CLOUDINARY_URL:
        # Use Cloudinary (persists on free tier, no disk needed on Render)
        public_id = f"yacht/{uuid.uuid4()}"
        try:
            # Resize before upload to save bandwidth
            try:
                img = PILImage.open(io.BytesIO(content))
                img.thumbnail((1920, 1080))
                buf = io.BytesIO()
                img.save(buf, format=img.format or "JPEG", optimize=True, quality=85)
                content = buf.getvalue()
            except Exception:
                pass
            url = _upload_to_cloudinary(content, public_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {e}")
    else:
        # Local disk (dev)
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        ext = file.filename.rsplit(".", 1)[-1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        path = os.path.join(settings.UPLOAD_DIR, filename)
        async with aiofiles.open(path, "wb") as f:
            await f.write(content)
        try:
            img = PILImage.open(path)
            img.thumbnail((1920, 1080))
            img.save(path, optimize=True, quality=85)
        except Exception:
            pass
        url = f"{base_url}/uploads/{filename}"

    images = yacht.images or []
    images.append(url)
    yacht.images = images
    flag_modified(yacht, "images")
    db.commit()
    db.refresh(yacht)
    return {"url": url, "images": yacht.images}


def _cloudinary_public_id_from_url(url: str) -> str | None:
    """Extract public_id from Cloudinary URL for destroy(). Returns None if not a Cloudinary URL."""
    if "cloudinary.com" not in url:
        return None
    # Format: .../upload/v123/folder/name.jpg or .../upload/folder/name.jpg
    import re
    m = re.search(r"/upload/(?:[^/]+/)*v\d+/(.+)$", url) or re.search(r"/upload/(.+)$", url)
    if not m:
        return None
    raw = m.group(1)
    # Remove file extension (Cloudinary public_id has no extension)
    if "." in raw:
        raw = raw.rsplit(".", 1)[0]
    return raw


@router.delete("/images", dependencies=[Depends(require_owner)])
def delete_image(url: str = Query(..., description="Full image URL to delete"), db: Session = Depends(get_db)):
    """Delete image by URL. Handles Cloudinary and local /uploads/ files."""
    yacht = db.query(Yacht).first()
    images = yacht.images or []

    if "cloudinary.com" in url:
        # Delete from Cloudinary
        public_id = _cloudinary_public_id_from_url(url)
        if public_id:
            try:
                import os as _os
                _cld = get_settings().CLOUDINARY_URL
                if _cld:
                    _os.environ["CLOUDINARY_URL"] = _cld
                    import cloudinary.uploader
                    cloudinary.uploader.destroy(public_id)
            except Exception:
                pass  # Still remove from DB
    else:
        # Local file: extract filename from .../uploads/filename
        filename = url.split("/uploads/")[-1].split("?")[0] if "/uploads/" in url else None
        if filename:
            path = os.path.join(settings.UPLOAD_DIR, filename)
            if os.path.exists(path):
                os.remove(path)

    images = [i for i in images if i != url]
    yacht.images = images
    flag_modified(yacht, "images")
    db.commit()
    return {"message": "Image deleted"}


@router.post("/videos", dependencies=[Depends(require_owner)])
async def upload_video(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    allowed_video_types = {"video/mp4", "video/webm", "video/quicktime"}
    if file.content_type not in allowed_video_types:
        raise HTTPException(status_code=400, detail="Only MP4, WebM, or MOV videos allowed")
    content = await file.read()
    # Max 100MB for videos
    if len(content) > 100 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Video too large (max 100MB)")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1].lower()
    filename = f"{uuid.uuid4()}.{ext}"
    path = os.path.join(settings.UPLOAD_DIR, filename)
    async with aiofiles.open(path, "wb") as f:
        await f.write(content)

    # Duration validation (best-effort). Frontend already enforces this, but
    # we add a server-side guard as well. If moviepy / ffmpeg is unavailable,
    # we silently skip duration validation rather than breaking uploads.
    MAX_VIDEO_SECONDS = 120
    try:
        from moviepy.editor import VideoFileClip  # type: ignore

        clip = VideoFileClip(path)
        duration = float(clip.duration or 0)
        clip.close()
        if duration > MAX_VIDEO_SECONDS:
            try:
                os.remove(path)
            except Exception:
                pass
            raise HTTPException(
                status_code=400,
                detail=f"Video too long (max {MAX_VIDEO_SECONDS} seconds)",
            )
    except HTTPException:
        raise
    except Exception:
        # If probing fails, fall back to size/type validation only.
        pass
    yacht = db.query(Yacht).first()
    base_url = str(request.base_url).rstrip("/")
    videos = yacht.videos or []
    videos.append(f"{base_url}/uploads/{filename}")
    yacht.videos = videos
    flag_modified(yacht, "videos")
    db.commit()
    db.refresh(yacht)
    return {"url": f"{base_url}/uploads/{filename}", "videos": yacht.videos}


@router.delete("/videos/{filename}", dependencies=[Depends(require_owner)])
def delete_video(filename: str, db: Session = Depends(get_db)):
    yacht = db.query(Yacht).first()
    path = os.path.join(settings.UPLOAD_DIR, filename)
    if os.path.exists(path):
        os.remove(path)
    yacht.videos = [v for v in (yacht.videos or []) if filename not in v]
    flag_modified(yacht, "videos")
    # If deleted video was featured, clear it
    if yacht.featured_video and filename in yacht.featured_video:
        yacht.featured_video = None
    db.commit()
    return {"message": "Video deleted"}


@router.post("/featured-image", dependencies=[Depends(require_owner)])
def set_featured_image(url: str = None, db: Session = Depends(get_db)):
    """Set the featured image for hero background"""
    yacht = db.query(Yacht).first()
    if url and url not in (yacht.images or []):
        raise HTTPException(status_code=400, detail="Image not in gallery")
    yacht.featured_image = url
    db.commit()
    return {"featured_image": yacht.featured_image}


@router.post("/featured-video", dependencies=[Depends(require_owner)])
def set_featured_video(url: str = None, db: Session = Depends(get_db)):
    """Set the featured video for hero background"""
    yacht = db.query(Yacht).first()
    if url and url not in (yacht.videos or []):
        raise HTTPException(status_code=400, detail="Video not in gallery")
    yacht.featured_video = url
    db.commit()
    return {"featured_video": yacht.featured_video}


@router.post("/block", dependencies=[Depends(require_owner)])
def block_date(data: BlockDateRequest, db: Session = Depends(get_db)):
    yacht = db.query(Yacht).first()
    existing = db.query(BlockedDate).filter(BlockedDate.yacht_id == yacht.id, BlockedDate.date == data.date).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"message": "Date unblocked", "date": str(data.date), "blocked": False}
    bd = BlockedDate(yacht_id=yacht.id, date=data.date, reason=data.reason)
    db.add(bd)
    db.commit()
    return {"message": "Date blocked", "date": str(data.date), "blocked": True}


@router.get("/blocked-dates", dependencies=[Depends(require_owner)])
def list_blocked_dates(db: Session = Depends(get_db)):
    yacht = db.query(Yacht).first()
    if not yacht:
        raise HTTPException(status_code=404, detail="Yacht not found")
    rows = (
        db.query(BlockedDate)
        .filter(BlockedDate.yacht_id == yacht.id)
        .order_by(BlockedDate.date.asc())
        .all()
    )
    return [{"date": str(r.date), "reason": r.reason} for r in rows]


@router.get("/availability")
def get_availability(year: int, month: int, db: Session = Depends(get_db)):
    from models.booking import Booking
    from datetime import date, timedelta
    yacht = db.query(Yacht).first()
    blocked = [str(b.date) for b in db.query(BlockedDate).filter(BlockedDate.yacht_id == yacht.id).all()]
    booked_dates = set()
    for b in db.query(Booking).filter(Booking.yacht_id == yacht.id, Booking.status != "cancelled").all():
        start = b.start_date
        end = b.end_date or b.start_date
        delta = (end - start).days
        if delta < 0:
            continue
        for i in range(delta + 1):
            booked_dates.add(str(start + timedelta(days=i)))
    booked = sorted(booked_dates)
    return {"blocked": blocked, "booked": booked}


# ── Extras ──────────────────────────────────────────────────────────────────
@router.get("/extras")
def get_extras(db: Session = Depends(get_db)):
    return db.query(Extra).filter(Extra.is_active == True).all()


@router.post("/extras", dependencies=[Depends(require_owner)], status_code=201)
def create_extra(data: ExtraCreate, db: Session = Depends(get_db)):
    e = Extra(**data.dict())
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


@router.put("/extras/{extra_id}", dependencies=[Depends(require_owner)])
def update_extra(extra_id: int, data: ExtraCreate, db: Session = Depends(get_db)):
    e = db.query(Extra).filter(Extra.id == extra_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Extra not found")
    for field, val in data.dict().items():
        setattr(e, field, val)
    db.commit()
    db.refresh(e)
    return e


@router.delete("/extras/{extra_id}", dependencies=[Depends(require_owner)])
def delete_extra(extra_id: int, db: Session = Depends(get_db)):
    e = db.query(Extra).filter(Extra.id == extra_id).first()
    if e:
        e.is_active = False
        db.commit()
    return {"message": "Extra removed"}
