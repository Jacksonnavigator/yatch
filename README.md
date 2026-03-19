# ⚓ Rock The Yatch — Yacht Booking System

A full-stack yacht charter booking platform built with **FastAPI + SQLite** (backend) and **React + Vite** (frontend).

---

## 🗂 Project Structure

```
yacht-booking/
├── backend/                  Python FastAPI backend
│   ├── main.py               App entry, lifespan, CORS, rate limiting
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example          → copy to .env and fill in
│   ├── core/
│   │   ├── config.py         Pydantic settings from .env
│   │   ├── database.py       SQLAlchemy + SQLite engine
│   │   └── security.py       JWT auth, password hashing, role guards
│   ├── models/
│   │   ├── user.py           User model (owner / guest roles)
│   │   └── booking.py        Yacht, Pricing, Booking, Extra, BlockedDate
│   ├── routers/
│   │   ├── auth.py           /register /login /refresh /me
│   │   ├── yacht.py          Yacht CRUD, images, pricing, block dates, extras
│   │   └── bookings.py       Create, list, status update, stats
│   └── utils/
│       └── email.py          HTML emails: confirmation, owner alert, status update
│
└── frontend/                 React + Vite frontend
    ├── vite.config.js        Dev proxy → backend:8000
    ├── package.json
    ├── Dockerfile
    ├── nginx.conf
    ├── index.html
    └── src/
        ├── main.jsx          Entry point
        ├── App.jsx           Router + all routes
        ├── index.css         Global luxury dark theme
        ├── api/client.js     Axios + cookie-based auth + auto refresh
        ├── context/
        │   └── AuthContext.jsx  Global auth state + login/register/logout
        ├── components/
        │   ├── Navbar.jsx       Responsive nav, role-aware links
        │   ├── Calendar.jsx     Live calendar connected to availability API
        │   └── ProtectedRoute.jsx  Guest + Owner route guards
        └── pages/
            ├── Home.jsx         Landing page with yacht info, pricing, gallery
            ├── Auth.jsx         Login + Register pages
            ├── BookPage.jsx     4-step booking wizard (type → date → details → extras)
            ├── MyBookings.jsx   Guest: booking history
            ├── OwnerDashboard.jsx  Owner: stats overview
            ├── OwnerBookings.jsx   Owner: full booking list, confirm/cancel
            ├── OwnerCalendar.jsx   Owner: block/unblock dates
            └── OwnerYacht.jsx      Owner: yacht details, images, pricing, extras
```

---

## 🚀 Quick Start (Local)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set SECRET_KEY, email settings, owner credentials

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The database is auto-created on first run. An owner account and default data are seeded automatically.

**API docs:** http://localhost:8000/api/docs

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

**App:** http://localhost:3000

---

## 🐳 Docker (Production)

```bash
cp backend/.env.example backend/.env
# Fill in backend/.env

docker-compose up --build
```

- Frontend: http://localhost
- Backend API: http://localhost:8000/api/docs

---

## 🔑 Default Accounts

After first run (from `.env`):

| Role  | Email                      | Password              |
|-------|----------------------------|-----------------------|
| Owner | owner@rockttheyatch.com    | SecureOwnerPass123!   |

Guests self-register at `/register`.

---

## 🌐 API Endpoints

### Auth
| Method | Path                  | Description              |
|--------|-----------------------|--------------------------|
| POST   | /api/auth/register    | Create guest account     |
| GET    | /api/auth/csrf        | Set CSRF cookie (for SPA) |
| POST   | /api/auth/login       | Login (sets httpOnly cookies) |
| POST   | /api/auth/refresh     | Refresh access token     |
| GET    | /api/auth/me          | Get current user         |
| PUT    | /api/auth/me          | Update profile           |
| POST   | /api/auth/logout      | Clear auth cookies       |
| POST   | /api/auth/verify      | Verify email token       |
| POST   | /api/auth/verify/request | Resend verification (authed) |
| POST   | /api/auth/forgot-password | Request password reset  |
| POST   | /api/auth/reset-password  | Reset password via token |

### Yacht
| Method | Path                        | Auth     |
|--------|-----------------------------|----------|
| GET    | /api/yacht/                 | Public   |
| PUT    | /api/yacht/                 | Owner    |
| PUT    | /api/yacht/pricing          | Owner    |
| POST   | /api/yacht/images           | Owner    |
| DELETE | /api/yacht/images/{name}    | Owner    |
| POST   | /api/yacht/block            | Owner    |
| GET    | /api/yacht/blocked-dates    | Owner    |
| GET    | /api/yacht/availability     | Public   |
| GET    | /api/yacht/extras           | Public   |
| POST   | /api/yacht/extras           | Owner    |
| PUT    | /api/yacht/extras/{id}      | Owner    |
| DELETE | /api/yacht/extras/{id}      | Owner    |

### Bookings
| Method | Path                          | Auth       |
|--------|-------------------------------|------------|
| POST   | /api/bookings/                | Guest/Owner|
| GET    | /api/bookings/my              | Guest      |
| GET    | /api/bookings/                | Owner      |
| GET    | /api/bookings/{id}            | Owner/own  |
| PUT    | /api/bookings/{id}/status     | Owner      |
| DELETE | /api/bookings/{id}            | Owner      |
| GET    | /api/bookings/stats/overview  | Owner      |

---

## 📧 Email Setup (Gmail)

1. Enable 2FA on your Gmail account
2. Create an App Password: Google Account → Security → App Passwords
3. Set in `.env`:
   ```
   MAIL_USERNAME=your@gmail.com
   MAIL_PASSWORD=your-app-password
   MAIL_FROM=your@gmail.com
   ```

---

## ☁️ Cloud Deployment

### Railway / Render / Fly.io
1. Push both `backend/` and `frontend/` to your repo
2. Deploy backend as a Python service — set all `.env` values as environment variables
3. Deploy frontend as a static site — set `VITE_API_URL` to your backend URL
4. Update `FRONTEND_URL` in backend env to your frontend domain

### Persistent Storage
For cloud SQLite, mount a persistent volume at `/app/yacht_booking.db` and `/app/uploads`.

---

## 🧱 Database Migrations (Alembic)

The backend now ships with a minimal Alembic setup:

- Config: `backend/alembic.ini`
- Environment: `backend/alembic/env.py`
- Baseline revision: `backend/alembic/versions/0001_initial_empty.py`

The baseline assumes the schema already created by `Base.metadata.create_all` is correct.
For future model changes:

```bash
cd backend

# Generate a new migration from model changes
alembic revision --autogenerate -m "describe your change"

# Apply migrations
alembic upgrade head
```

In CI or deployment pipelines, run `alembic upgrade head` before starting the API
to ensure the database schema is up to date.

---

## 🛡 Recommended Production `.env` Template (Backend)

Example for a deployment at `https://api.youryacht.com` with frontend at `https://yacht.youryacht.com`:

```ini
APP_NAME="Rock The Yatch Booking"
ENVIRONMENT=production

# Security
SECRET_KEY="a-long-random-secret-key-here"
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Frontend & CORS
FRONTEND_URL=https://yacht.youryacht.com
CORS_ALLOW_ORIGINS=https://yacht.youryacht.com
ALLOWED_HOSTS=api.youryacht.com,yacht.youryacht.com

# Database
DATABASE_URL=sqlite:///./yacht_booking.db
# Or Postgres, e.g.:
# DATABASE_URL=postgresql+psycopg2://user:password@db-host:5432/yacht_booking

# Email (example: Gmail with app password)
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your@gmail.com
MAIL_FROM_NAME="Rock The Yatch"
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_STARTTLS=true
MAIL_SSL_TLS=false

# Owner seed
OWNER_EMAIL=owner@youryacht.com
OWNER_PASSWORD="ChangeMe_ProductionOnly!"
OWNER_NAME="Yacht Owner"

# Uploads
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp

# Rate limiting
RATE_LIMIT_PER_MINUTE=60
```

---

## ✅ Health / Liveness / Readiness Checks

The backend exposes a lightweight health endpoint:

- **Path**: `/api/health`
- **Method**: `GET`
- **Response**:
  ```json
  { "status": "ok", "app": "Rock The Yatch Booking", "env": "production" }
  ```

You can use this for:

- **Docker `HEALTHCHECK`**:
  ```dockerfile
  HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1
  ```

- **Kubernetes liveness/readiness probes**:
  ```yaml
  livenessProbe:
    httpGet:
      path: /api/health
      port: 8000
    initialDelaySeconds: 10
    periodSeconds: 30

  readinessProbe:
    httpGet:
      path: /api/health
      port: 8000
    initialDelaySeconds: 5
    periodSeconds: 15
  ```

This ensures your orchestrator only routes traffic to healthy API instances and can restart pods/containers that fail.

---

## 📈 Monitoring & Backups (Production Story)

### Monitoring

- **Metrics**: The backend exposes a basic Prometheus-style metrics endpoint at:
  - `GET /metrics` — includes:
    - `http_requests_total{path,method,status}`
    - `http_request_duration_seconds_sum/count/avg{path}`
- **Request IDs**:
  - Every request is assigned an `X-Request-ID` header (or echoes the incoming one).
  - The global error handler logs with this `request_id` so you can trace failures across logs.

You can:

- Point Prometheus at `/metrics` on each backend instance.
- Use `X-Request-ID` in your log aggregation (ELK, Loki, etc.) to correlate errors with specific requests.

### Backups

For simple deployments using SQLite + local uploads:

- A helper script is provided at `backend/scripts/backup.sh`:
  - Creates timestamped copies of:
    - `yacht_booking.db`
    - `uploads/` (tar.gz archive)
  - Usage (from `backend/`):
    ```bash
    chmod +x scripts/backup.sh
    ./scripts/backup.sh /var/backups/yacht-booking
    ```

Recommended production approach:

- Schedule `backup.sh` via cron or your orchestrator (e.g. Kubernetes CronJob).
- Sync the backup directory to durable object storage (S3, GCS, etc.).
- For Postgres/MySQL deployments, replace the SQLite copy with `pg_dump`/`mysqldump` but keep archiving `uploads/` similarly.

---

## 🔒 Production Security Notes

- **CORS**: in production, the backend will only allow origins from `CORS_ALLOW_ORIGINS` (comma-separated) or `FRONTEND_URL` if empty.
- **Allowed hosts**: set `ALLOWED_HOSTS` (comma-separated) to your domain(s) to prevent Host header attacks.
- **HTTPS**: the backend redirects to HTTPS automatically in non-dev environments.

---

## ✨ Features Summary

**Guest:**
- Browse yacht info, amenities, gallery, pricing
- Register / login with JWT auth
- 4-step booking wizard: charter type → date picker → personal details → premium add-ons
- Live availability calendar (blocked + booked dates)
- Price calculator with add-ons
- Booking confirmation screen + email
- My Bookings history with status tracking

**Owner:**
- Secure owner-only dashboard
- Revenue stats overview
- Full bookings list with filter (all / pending / confirmed / cancelled)
- Expand each booking to confirm, cancel, or add owner notes
- Email sent to guest on status change
- Calendar: click to block/unblock dates
- Yacht management: edit name, model, description, location, amenities
- Image gallery: upload, display, delete yacht photos
- Pricing: edit all 4 charter type rates
- Add-ons: create, edit, remove premium extras

**Backend:**
- FastAPI + SQLAlchemy + SQLite
- JWT access + refresh tokens with auto-rotation
- Role-based route protection (guest / owner)
- HTML email notifications (booking confirmation, owner alert, status update)
- Image upload with resize/optimize via Pillow
- Rate limiting (slowapi)
- Cloud-ready with .env config
- Auto database seed on first run
- Full OpenAPI docs at /api/docs
