from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import List, Optional
from datetime import date, timedelta
import random, string
from core.database import get_db
from core.security import get_current_user, require_owner
from models.booking import Booking, Yacht, Pricing, Extra, BlockedDate
from models.user import User
from utils.email import send_booking_confirmation, send_owner_new_booking, send_status_update
from core.config import get_settings

router = APIRouter(prefix="/api/bookings", tags=["bookings"])
settings = get_settings()

CHARTER_TYPES = {"full_day", "half_day", "hourly", "multi_day"}


def gen_ref() -> str:
    return "YB-" + "".join(random.choices(string.digits, k=6))


def _date_range_inclusive(start: date, end: date) -> List[date]:
    days = (end - start).days
    if days < 0:
        return []
    return [start + timedelta(days=i) for i in range(days + 1)]


def calc_price(
    charter_type: str,
    start_date: date,
    end_date: Optional[date],
    extras: List[str],
    pricing: Pricing,
    all_extras: List[Extra],
    hourly_hours: Optional[int] = None,
) -> tuple:
    if charter_type == "full_day":
        base = pricing.full_day
    elif charter_type == "half_day":
        base = pricing.half_day
    elif charter_type == "hourly":
        hours = int(hourly_hours or 4)
        base = pricing.hourly * hours
    elif charter_type == "multi_day":
        if not end_date:
            base = pricing.daily_multi
        else:
            # Inclusive: booking from 2026-03-01 to 2026-03-03 is 3 days.
            days = (end_date - start_date).days + 1
            base = pricing.daily_multi * max(1, days)
    else:
        base = 0.0
    extras_map = {e.key: e.price for e in all_extras}
    extras_total = sum(extras_map.get(k, 0) for k in extras)
    return base, extras_total, base + extras_total


class BookingCreate(BaseModel):
    guest_name: str = Field(min_length=1, max_length=120)
    guest_email: EmailStr
    guest_phone: str = Field(default="", max_length=30)
    charter_type: str
    start_date: date
    end_date: Optional[date] = None
    num_guests: int = Field(default=1, ge=1, le=200)
    hourly_hours: Optional[int] = Field(default=None, ge=1, le=24)
    extras: List[str] = []
    notes: str = Field(default="", max_length=2000)

    @field_validator("charter_type")
    @classmethod
    def _validate_charter_type(cls, v: str) -> str:
        if v not in CHARTER_TYPES:
            raise ValueError(f"Invalid charter type. Must be one of: {CHARTER_TYPES}")
        return v

    @field_validator("guest_phone")
    @classmethod
    def _validate_phone(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            return ""
        # Lightweight E.164-ish validation without external deps.
        allowed = set("0123456789+ -()")
        if any(ch not in allowed for ch in v):
            raise ValueError("Invalid phone number format")
        digits = [ch for ch in v if ch.isdigit()]
        if len(digits) < 7 or len(digits) > 15:
            raise ValueError("Invalid phone number length")
        return v

    @model_validator(mode="after")
    def _validate_dates_and_duration(self):
        if self.charter_type == "multi_day":
            if not self.end_date:
                raise ValueError("end_date is required for multi_day bookings")
            if self.end_date < self.start_date:
                raise ValueError("end_date must be on or after start_date")
        else:
            # Non-multi-day bookings should not span multiple dates.
            if self.end_date and self.end_date != self.start_date:
                raise ValueError("end_date must be empty or equal to start_date for this charter type")
        if self.charter_type == "hourly":
            if not self.hourly_hours:
                raise ValueError("hourly_hours is required for hourly bookings")
        else:
            if self.hourly_hours is not None:
                raise ValueError("hourly_hours is only allowed for hourly bookings")
        return self


class StatusUpdate(BaseModel):
    status: str  # confirmed | cancelled
    owner_notes: str = ""


def _booking_dict(b: Booking) -> dict:
    return {
        "id": b.id,
        "reference": b.reference,
        "guest_name": b.guest_name,
        "guest_email": b.guest_email,
        "guest_phone": b.guest_phone,
        "charter_type": b.charter_type,
        "start_date": str(b.start_date),
        "end_date": str(b.end_date) if b.end_date else None,
        "num_guests": b.num_guests,
        "extras": b.extras or [],
        "notes": b.notes,
        "base_price": b.base_price,
        "extras_price": b.extras_price,
        "total_price": b.total_price,
        "status": b.status,
        "owner_notes": b.owner_notes,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


@router.post("/", status_code=201)
async def create_booking(data: BookingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    yacht = db.query(Yacht).first()
    if not yacht:
        raise HTTPException(status_code=404, detail="Yacht not found")
    if data.num_guests > (yacht.max_guests or 0):
        raise HTTPException(status_code=400, detail=f"Too many guests (max {yacht.max_guests})")

    start = data.start_date
    end = data.end_date or data.start_date

    # Check date conflicts across the full (inclusive) range.
    # Treat existing bookings with null end_date as single-day bookings.
    conflict = (
        db.query(Booking)
        .filter(
            Booking.yacht_id == yacht.id,
            Booking.status != "cancelled",
            Booking.start_date <= end,
            (Booking.end_date == None) | (Booking.end_date >= start),  # noqa: E711
        )
        .first()
    )
    if conflict:
        raise HTTPException(status_code=409, detail="Selected dates overlap an existing booking")

    blocked = (
        db.query(BlockedDate)
        .filter(
            BlockedDate.yacht_id == yacht.id,
            BlockedDate.date >= start,
            BlockedDate.date <= end,
        )
        .first()
    )
    if blocked:
        raise HTTPException(status_code=409, detail="One or more selected dates are blocked by the owner")
    pricing = db.query(Pricing).filter(Pricing.yacht_id == yacht.id).first()
    if not pricing:
        pricing = Pricing(yacht_id=yacht.id)
    all_extras = db.query(Extra).filter(Extra.is_active == True).all()
    base, extras_total, total = calc_price(
        data.charter_type,
        data.start_date,
        data.end_date,
        data.extras,
        pricing,
        all_extras,
        hourly_hours=data.hourly_hours,
    )
    if base < 0 or extras_total < 0 or total < 0:
        raise HTTPException(status_code=400, detail="Invalid pricing configuration (negative totals)")
    # Generate unique ref
    ref = gen_ref()
    while db.query(Booking).filter(Booking.reference == ref).first():
        ref = gen_ref()
    booking = Booking(
        reference=ref,
        yacht_id=yacht.id,
        user_id=current_user.id,
        guest_name=data.guest_name,
        guest_email=data.guest_email,
        guest_phone=data.guest_phone,
        charter_type=data.charter_type,
        start_date=data.start_date,
        end_date=data.end_date,
        num_guests=data.num_guests,
        extras=data.extras,
        notes=data.notes,
        base_price=base,
        extras_price=extras_total,
        total_price=total,
        status="pending",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    # Send emails
    details = {
        "charter_type": data.charter_type.replace("_", " ").title(),
        "date": str(data.start_date),
        "end_date": str(data.end_date) if data.end_date else None,
        "hourly_hours": data.hourly_hours if data.charter_type == "hourly" else None,
        "guests": data.num_guests,
        "total": total,
        "extras": [e.name for e in all_extras if e.key in data.extras],
        "email": data.guest_email,
        "phone": data.guest_phone,
    }
    await send_booking_confirmation(data.guest_email, data.guest_name, ref, details)
    owner = db.query(User).filter(User.role == "owner").first()
    if owner:
        await send_owner_new_booking(owner.email, ref, data.guest_name, details)
    return _booking_dict(booking)


@router.get("/my")
def my_bookings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bks = db.query(Booking).filter(Booking.user_id == current_user.id).order_by(Booking.created_at.desc()).all()
    return [_booking_dict(b) for b in bks]


@router.get("/", dependencies=[Depends(require_owner)])
def list_bookings(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(Booking).order_by(Booking.created_at.desc())
    if status:
        q = q.filter(Booking.status == status)
    return [_booking_dict(b) for b in q.all()]


@router.get("/{booking_id}")
def get_booking(booking_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    if current_user.role != "owner" and b.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return _booking_dict(b)


@router.put("/{booking_id}/status", dependencies=[Depends(require_owner)])
async def update_status(booking_id: int, data: StatusUpdate, db: Session = Depends(get_db)):
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    if data.status not in ("confirmed", "cancelled"):
        raise HTTPException(status_code=400, detail="Status must be confirmed or cancelled")
    b.status = data.status
    b.owner_notes = data.owner_notes
    db.commit()
    await send_status_update(b.guest_email, b.guest_name, b.reference, data.status)
    return _booking_dict(b)


@router.delete("/{booking_id}", dependencies=[Depends(require_owner)])
def delete_booking(booking_id: int, db: Session = Depends(get_db)):
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if b:
        db.delete(b)
        db.commit()
    return {"message": "Booking deleted"}


@router.get("/stats/overview", dependencies=[Depends(require_owner)])
def booking_stats(db: Session = Depends(get_db)):
    all_bks = db.query(Booking).all()
    confirmed = [b for b in all_bks if b.status == "confirmed"]
    pending = [b for b in all_bks if b.status == "pending"]
    return {
        "total": len(all_bks),
        "confirmed": len(confirmed),
        "pending": len(pending),
        "cancelled": len([b for b in all_bks if b.status == "cancelled"]),
        "total_revenue": sum(b.total_price for b in confirmed),
        "pending_revenue": sum(b.total_price for b in pending),
    }
