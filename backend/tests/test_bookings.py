import os
import sys
from datetime import date

import pytest
from fastapi.testclient import TestClient


# Ensure backend package is importable when running pytest from backend/
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
  sys.path.insert(0, ROOT_DIR)

# Use a separate SQLite file for tests
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_yacht_booking.db")

from main import app  # type: ignore  # noqa: E402
from core.database import SessionLocal  # type: ignore  # noqa: E402
from models.booking import Yacht  # type: ignore  # noqa: E402


@pytest.fixture(scope="session")
def client():
  with TestClient(app) as c:
    # Each test function should see a clean database; easiest is to clear users/bookings between tests,
    # but for simplicity we rely on unique emails per test via _ensure_guest_logged_in.
    yield c


def _csrf_headers(client: TestClient) -> dict:
  # Ensure csrf cookie exists
  client.get("/api/auth/csrf")
  token = client.cookies.get("csrf_token")
  return {"X-CSRF-Token": token} if token else {}


def _register_guest(client: TestClient, email: str = "guest@example.com"):
  headers = _csrf_headers(client)
  payload = {
    "name": "Test Guest",
    "email": email,
    "password": "StrongGuestPass123",
    "phone": "+1234567890",
  }
  r = client.post("/api/auth/register", json=payload, headers=headers)
  assert r.status_code == 201


def _auth_headers(client: TestClient) -> dict:
  # Cookie-based auth; nothing special required for protected routes
  return {}


def _ensure_guest_logged_in(client: TestClient, email: str):
  _register_guest(client, email=email)


def test_multi_day_pricing_inclusive(client: TestClient):
  _ensure_guest_logged_in(client, email="inclusive@example.com")
  # Get current pricing to compute expectation
  yacht_res = client.get("/api/yacht/")
  assert yacht_res.status_code == 200
  pricing = yacht_res.json().get("pricing") or {}
  daily_multi = pricing.get("daily_multi")
  assert daily_multi is not None

  headers = _csrf_headers(client)
  payload = {
    "guest_name": "Inclusive Guest",
    "guest_email": "inclusive@example.com",
    "guest_phone": "+111111111",
    "charter_type": "multi_day",
    "start_date": "2026-03-01",
    "end_date": "2026-03-03",
    "num_guests": 2,
    "extras": [],
    "notes": "",
  }
  r = client.post("/api/bookings/", json=payload, headers=headers)
  assert r.status_code == 201, r.text
  data = r.json()
  assert data["start_date"] == "2026-03-01"
  assert data["end_date"] == "2026-03-03"
  # Inclusive 3 days
  assert data["base_price"] == pytest.approx(daily_multi * 3)


def test_multi_day_conflict_on_range(client: TestClient):
  _ensure_guest_logged_in(client, email="range1@example.com")
  headers = _csrf_headers(client)
  # First booking: 1st → 3rd
  r1 = client.post(
    "/api/bookings/",
    json={
      "guest_name": "Range One",
      "guest_email": "range1@example.com",
      "guest_phone": "+111111111",
      "charter_type": "multi_day",
      "start_date": "2026-04-01",
      "end_date": "2026-04-03",
      "num_guests": 2,
      "extras": [],
      "notes": "",
    },
    headers=headers,
  )
  assert r1.status_code == 201, r1.text

  # Second booking overlapping on 2nd should be rejected
  r2 = client.post(
    "/api/bookings/",
    json={
      "guest_name": "Range Two",
      "guest_email": "range2@example.com",
      "guest_phone": "+222222222",
      "charter_type": "full_day",
      "start_date": "2026-04-02",
      "end_date": None,
      "num_guests": 2,
      "extras": [],
      "notes": "",
    },
    headers=headers,
  )
  assert r2.status_code == 409


def test_max_guests_enforced(client: TestClient):
  _ensure_guest_logged_in(client, email="maxguest@example.com")

  # Lower max_guests on yacht directly in the test database
  db = SessionLocal()
  try:
    yacht = db.query(Yacht).first()
    yacht.max_guests = 4
    db.commit()
  finally:
    db.close()

  headers = _csrf_headers(client)
  r = client.post(
    "/api/bookings/",
    json={
      "guest_name": "Too Many",
      "guest_email": "too-many@example.com",
      "guest_phone": "+333333333",
      "charter_type": "full_day",
      "start_date": date.today().isoformat(),
      "end_date": None,
      "num_guests": 8,
      "extras": [],
      "notes": "",
    },
    headers=headers,
  )
  assert r.status_code == 400
  assert "Too many guests" in r.json().get("detail", "")


def test_hourly_hours_dynamic_pricing(client: TestClient):
  _ensure_guest_logged_in(client, email="hourly@example.com")
  yacht_res = client.get("/api/yacht/")
  assert yacht_res.status_code == 200
  pricing = yacht_res.json().get("pricing") or {}
  hourly = pricing.get("hourly")
  assert hourly is not None

  headers = _csrf_headers(client)
  r = client.post(
    "/api/bookings/",
    json={
      "guest_name": "Hourly Guest",
      "guest_email": "hourly@example.com",
      "guest_phone": "+444444444",
      "charter_type": "hourly",
      "start_date": "2026-05-01",
      "end_date": None,
      "hourly_hours": 6,
      "num_guests": 2,
      "extras": [],
      "notes": "",
    },
    headers=headers,
  )
  assert r.status_code == 201, r.text
  data = r.json()
  assert data["base_price"] == pytest.approx(hourly * 6)

