import os
import sys
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient


ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_yacht_booking.db")

from main import app  # type: ignore  # noqa: E402
from core.database import SessionLocal  # type: ignore  # noqa: E402
from models.user import User  # type: ignore  # noqa: E402
from models.booking import Yacht, Extra  # type: ignore  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def _csrf_headers(c: TestClient) -> dict:
    # Ensure CSRF cookie exists
    c.get("/api/auth/csrf")
    token = c.cookies.get("csrf_token")
    return {"X-CSRF-Token": token} if token else {}


def _login_owner(c: TestClient):
    headers = _csrf_headers(c)
    data = {
        "username": "owner@rockttheyatch.com",
        "password": "SecureOwnerPass123!",
    }
    r = c.post("/api/auth/login", data=data, headers=headers)
    assert r.status_code == 200, r.text


def _create_guest_direct(email: str) -> User:
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == email).first()
        if u:
            return u
        u = User(
            name="Test Guest",
            email=email,
            hashed_password="$2b$12$abcdefghijklmnopqrstuv",  # dummy; we don't log in with it
            phone="",
            role="guest",
            email_verified=False,
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        return u
    finally:
        db.close()


def test_auth_register_login_refresh_logout_flow(client: TestClient):
    # Register
    headers = _csrf_headers(client)
    payload = {
        "name": "Flow Guest",
        "email": f"flow-guest-{datetime.utcnow().timestamp()}@example.com",
        "password": "StrongGuestPass123",
        "phone": "+10000000000",
    }
    r = client.post("/api/auth/register", json=payload, headers=headers)
    assert r.status_code == 201, r.text

    # /me should work (already logged in via cookies)
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"].startswith("flow-guest-")

    # Refresh token via cookies only
    r2 = client.post("/api/auth/refresh", headers=_csrf_headers(client))
    assert r2.status_code == 200

    # Logout clears cookies – subsequent /me should 401
    out = client.post("/api/auth/logout", headers=_csrf_headers(client))
    assert out.status_code == 200
    me2 = client.get("/api/auth/me")
    assert me2.status_code == 401


def test_email_verify_and_password_reset(client: TestClient):
    # Register a new user
    email = f"verify-reset-{datetime.utcnow().timestamp()}@example.com"
    headers = _csrf_headers(client)
    r = client.post(
        "/api/auth/register",
        json={
            "name": "Verify Reset",
            "email": email,
            "password": "StrongGuestPass123",
            "phone": "",
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text

    # Grab verification token from DB
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        assert user and user.email_verification_token
        verify_token = user.email_verification_token
    finally:
        db.close()

    # Verify
    v = client.post("/api/auth/verify", json={"token": verify_token}, headers=_csrf_headers(client))
    assert v.status_code == 200

    # Forgot password – request reset link
    f = client.post(
        "/api/auth/forgot-password",
        json={"email": email},
        headers=_csrf_headers(client),
    )
    assert f.status_code == 200

    # Read reset token
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        assert user and user.password_reset_token
        reset_token = user.password_reset_token
    finally:
        db.close()

    # Reset password
    rp = client.post(
        "/api/auth/reset-password",
        json={"token": reset_token, "password": "NewStrongPass456"},
        headers=_csrf_headers(client),
    )
    assert rp.status_code == 200

    # Login with new password
    headers = _csrf_headers(client)
    login = client.post(
        "/api/auth/login",
        data={"username": email, "password": "NewStrongPass456"},
        headers=headers,
    )
    assert login.status_code == 200, login.text


def test_csrf_required_for_cookie_auth(client: TestClient):
    # Obtain CSRF cookie
    client.get("/api/auth/csrf")
    # Missing header should be rejected on unsafe method
    r = client.post("/api/auth/register", json={
        "name": "No CSRF",
        "email": f"no-csrf-{datetime.utcnow().timestamp()}@example.com",
        "password": "StrongGuestPass123",
        "phone": "",
    })
    assert r.status_code == 403

    # With matching header should succeed
    headers = _csrf_headers(client)
    email = f"with-csrf-{datetime.utcnow().timestamp()}@example.com"
    r2 = client.post("/api/auth/register", json={
        "name": "With CSRF",
        "email": email,
        "password": "StrongGuestPass123",
        "phone": "",
    }, headers=headers)
    assert r2.status_code == 201, r2.text


def test_owner_pricing_and_extras_and_blocking(client: TestClient):
    _login_owner(client)

    # Update pricing
    headers = _csrf_headers(client)
    p = client.put(
        "/api/yacht/pricing",
        json={"full_day": 4000, "half_day": 2200, "hourly": 500, "daily_multi": 3200},
        headers=headers,
    )
    assert p.status_code == 200

    # Create an extra
    e = client.post(
        "/api/yacht/extras",
        json={
            "key": f"test_extra_{datetime.utcnow().timestamp()}",
            "name": "Test Extra",
            "description": "Testing",
            "price": 123,
            "icon": "✅",
        },
        headers=headers,
    )
    assert e.status_code == 201, e.text
    extra_id = e.json()["id"]

    # Update extra
    e2 = client.put(
        f"/api/yacht/extras/{extra_id}",
        json={
            "key": e.json()["key"],
            "name": "Test Extra Updated",
            "description": "Updated",
            "price": 150,
            "icon": "✨",
        },
        headers=headers,
    )
    assert e2.status_code == 200

    # Delete extra (soft deactivate)
    d = client.delete(f"/api/yacht/extras/{extra_id}", headers=headers)
    assert d.status_code == 200

    # Block and unblock a date
    b1 = client.post(
        "/api/yacht/block",
        json={"date": "2026-06-01", "reason": "Maintenance"},
        headers=headers,
    )
    assert b1.status_code == 200
    assert b1.json()["blocked"] is True

    b2 = client.post(
        "/api/yacht/block",
        json={"date": "2026-06-01", "reason": "Maintenance"},
        headers=headers,
    )
    assert b2.status_code == 200
    assert b2.json()["blocked"] is False

