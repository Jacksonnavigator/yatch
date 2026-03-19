from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from sqlalchemy import text
import os, logging, time, uuid
from fastapi.responses import JSONResponse, PlainTextResponse

from core.config import get_settings
from core.limiting import get_limiter
from core.database import Base, engine, SessionLocal
from core.security import hash_password
from core.csrf import require_csrf
from models.user import User
from models.booking import Yacht, Pricing, Extra, BlockedDate, Booking
from routers import auth, yacht, bookings

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
is_dev = settings.ENVIRONMENT.lower() in ("development", "dev", "local")

# ── In-memory metrics (simple Prometheus-style) ──────────────────────────────
http_request_counts: dict[tuple[str, str, int], int] = {}
http_request_duration: dict[str, dict[str, float]] = {}


def seed_database(db: Session):
    """Create owner account, yacht, pricing and default extras on first run."""
    # Owner
    if not db.query(User).filter(User.role == "owner").first():
        # bcrypt has a hard 72-byte password limit. Enforce it to avoid
        # startup failures when OWNER_PASSWORD is set via env.
        owner_pw = settings.OWNER_PASSWORD or ""
        if len(owner_pw.encode("utf-8")) > 72:
            raise RuntimeError(
                "OWNER_PASSWORD exceeds bcrypt 72-byte limit. "
                "Shorten it to <=72 bytes and redeploy."
            )
        owner = User(
            name=settings.OWNER_NAME,
            email=settings.OWNER_EMAIL,
            hashed_password=hash_password(owner_pw),
            role="owner",
            email_verified=True,
        )
        db.add(owner)
        logger.info(f"Owner account created: {settings.OWNER_EMAIL}")

    # Yacht
    if not db.query(Yacht).first():
        y = Yacht(
            name="Rock The Yatch",
            model="Sunseeker Predator 58",
            length_ft=58,
            max_guests=12,
            description="Rock The Yatch is a stunning 58ft Sunseeker Predator offering the ultimate private charter experience. With sleek lines, a powerful twin-engine setup, and a luxuriously appointed interior, she is perfect for day trips, sunset cruises, and extended voyages.",
            location="Mediterranean & Caribbean",
            amenities=["Air Conditioning", "Flybridge", "Jet Ski", "BBQ", "Bluetooth Sound System", "Snorkeling Gear", "Sun Deck", "Swim Platform"],
            images=[],
        )
        db.add(y)
        db.flush()
        p = Pricing(yacht_id=y.id, full_day=3200, half_day=1800, hourly=450, daily_multi=2800)
        db.add(p)
        logger.info("Yacht and pricing seeded")

    # Extras
    if not db.query(Extra).first():
        extras_data = [
            Extra(key="catering", name="Catering — Premium", description="5-course private chef experience on board", price=800, icon="🍽️"),
            Extra(key="crew", name="Crew — Private Captain", description="Dedicated skipper & professional deckhand", price=600, icon="⚓"),
            Extra(key="water", name="Water Sports Package", description="Jet ski, snorkel set & paddleboard included", price=400, icon="🏄"),
            Extra(key="photo", name="Photography Session", description="Professional on-board photographer, edited gallery", price=350, icon="📸"),
            Extra(key="flowers", name="Floral Arrangements", description="Luxury fresh flower décor throughout the yacht", price=250, icon="💐"),
            Extra(key="transfer", name="Airport Transfer", description="Private chauffeur to/from the marina", price=180, icon="🚘"),
        ]
        db.add_all(extras_data)
        logger.info("Default extras seeded")

    # Ensure existing yacht record uses the requested display name and description
    yacht = db.query(Yacht).first()
    if yacht:
        yacht.name = "Rock The Yatch"
        yacht.description = "Rock The Yatch is a stunning 58ft Sunseeker Predator offering the ultimate private charter experience. With sleek lines, a powerful twin-engine setup, and a luxuriously appointed interior, she is perfect for day trips, sunset cruises, and extended voyages."
    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables
    Base.metadata.create_all(bind=engine)
    # Lightweight SQLite migrations for newly added columns (no alembic runtime).
    if "sqlite" in settings.DATABASE_URL:
        with engine.connect() as conn:
            cols = {r[1] for r in conn.execute(text("PRAGMA table_info(users)")).fetchall()}
            needed = {
                "email_verified": "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0",
                "email_verification_token": "ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255)",
                "email_verification_expires": "ALTER TABLE users ADD COLUMN email_verification_expires DATETIME",
                "password_reset_token": "ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255)",
                "password_reset_expires": "ALTER TABLE users ADD COLUMN password_reset_expires DATETIME",
            }
            for name, ddl in needed.items():
                if name not in cols:
                    conn.execute(text(ddl))
            conn.commit()
    # Ensure upload dir is an absolute path (avoid issues when uvicorn cwd differs)
    base_dir = os.path.dirname(__file__)
    settings.UPLOAD_DIR = os.path.abspath(os.path.join(base_dir, settings.UPLOAD_DIR))
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    if settings.ENVIRONMENT.lower() not in ("development", "dev", "local") and settings.SECRET_KEY.strip() == "change-this-secret-key-in-production":
        raise RuntimeError("SECRET_KEY is not set. Refusing to start in non-development environment.")
    logger.info(f"🚢 Rock The Yatch API started — {settings.ENVIRONMENT}")
    yield
    logger.info("API shutting down")


# Rate limiter
limiter = get_limiter(settings.RATE_LIMIT_PER_MINUTE)

app = FastAPI(
    title="Rock The Yatch Booking API",
    description="Full-featured yacht charter booking system",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
cors_origins = []
if is_dev:
    cors_origins = [settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"]
else:
    cors_origins = settings.cors_allow_origins_list or [settings.FRONTEND_URL]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_and_metrics_middleware(request: Request, call_next):
    # Attach a request_id for log correlation
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    # Store on request.state so handlers can use it if needed
    request.state.request_id = request_id

    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        # Even for unhandled exceptions, record metrics with 500
        elapsed = time.perf_counter() - start
        key = (request.url.path, request.method, 500)
        http_request_counts[key] = http_request_counts.get(key, 0) + 1
        d = http_request_duration.setdefault(request.url.path, {"sum": 0.0, "count": 0})
        d["sum"] += elapsed
        d["count"] += 1
        raise

    elapsed = time.perf_counter() - start
    status = response.status_code
    key = (request.url.path, request.method, status)
    http_request_counts[key] = http_request_counts.get(key, 0) + 1
    d = http_request_duration.setdefault(request.url.path, {"sum": 0.0, "count": 0})
    d["sum"] += elapsed
    d["count"] += 1

    # Expose request id to clients
    response.headers.setdefault("X-Request-ID", request_id)
    return response

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    # Content Security Policy – conservative but compatible with current frontend.
    # Allows inline styles (used heavily) but restricts scripts to self.
    csp = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data: blob:; "
        "media-src 'self' blob:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'"
    )
    resp.headers.setdefault("Content-Security-Policy", csp)
    if not is_dev:
        resp.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return resp


@app.middleware("http")
async def csrf_middleware(request: Request, call_next):
    # Enforce CSRF for cookie-authenticated unsafe requests.
    # Skip FastAPI docs and static.
    if request.url.path.startswith("/api") and not request.url.path.startswith("/api/docs") and not request.url.path.startswith("/api/redoc"):
        try:
            require_csrf(request)
        except Exception as e:
            # If it's an HTTPException, FastAPI will handle; but middleware needs explicit response.
            from fastapi import HTTPException
            if isinstance(e, HTTPException):
                return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
            raise
    return await call_next(request)

# HTTPS redirect (production)
if not is_dev:
    app.add_middleware(HTTPSRedirectMiddleware)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts_list or ["localhost"])


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", None)
    logger.exception("Unhandled server error", extra={"request_id": req_id})
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Static uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routers
app.include_router(auth.router)
app.include_router(yacht.router)
app.include_router(bookings.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.ENVIRONMENT}


@app.get("/metrics")
def metrics():
    """Very small Prometheus-style metrics endpoint."""
    lines: list[str] = []
    lines.append("# HELP http_requests_total Total HTTP requests")
    lines.append("# TYPE http_requests_total counter")
    for (path, method, status), count in sorted(http_request_counts.items()):
        lines.append(
            f'http_requests_total{{path="{path}",method="{method}",status="{status}"}} {count}'
        )

    lines.append("# HELP http_request_duration_seconds Request duration in seconds")
    lines.append("# TYPE http_request_duration_seconds summary")
    for path, d in sorted(http_request_duration.items()):
        if d["count"] == 0:
            continue
        avg = d["sum"] / d["count"]
        lines.append(
            f'http_request_duration_seconds_sum{{path="{path}"}} {d["sum"]}'
        )
        lines.append(
            f'http_request_duration_seconds_count{{path="{path}"}} {d["count"]}'
        )
        lines.append(
            f'http_request_duration_seconds_avg{{path="{path}"}} {avg}'
        )

    body = "\n".join(lines) + "\n"
    return PlainTextResponse(content=body, media_type="text/plain")
