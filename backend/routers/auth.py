from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import timedelta, datetime
import secrets
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.database import get_db
from core.security import verify_password, hash_password, create_access_token, create_refresh_token, decode_token, get_current_user
from core.config import get_settings
from models.user import User
from utils.email import send_email_verification, send_password_reset
from core.csrf import csrf_cookie_name

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


def _cookie_secure() -> bool:
    return settings.ENVIRONMENT.lower() not in ("development", "dev", "local")


def _set_auth_cookies(resp: Response, access: str, refresh: str):
    secure = _cookie_secure()
    # access token cookie (short lived)
    resp.set_cookie(
        key="access_token",
        value=access,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    # refresh token cookie (longer lived)
    resp.set_cookie(
        key="refresh_token",
        value=refresh,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/",
    )
    # CSRF token (double-submit): readable by JS
    resp.set_cookie(
        key=csrf_cookie_name(),
        value=secrets.token_urlsafe(24),
        httponly=False,
        secure=secure,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/",
    )


def _clear_auth_cookies(resp: Response):
    secure = _cookie_secure()
    resp.delete_cookie("access_token", path="/", secure=secure, samesite="lax")
    resp.delete_cookie("refresh_token", path="/", secure=secure, samesite="lax")
    resp.delete_cookie(csrf_cookie_name(), path="/", secure=secure, samesite="lax")


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str = ""


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    name: str


class RefreshRequest(BaseModel):
    refresh_token: str


class VerifyTokenRequest(BaseModel):
    token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("10/minute;200/day")
async def register(request: Request, response: Response, data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    token = secrets.token_urlsafe(32)
    exp = datetime.utcnow() + timedelta(hours=24)
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
        phone=data.phone,
        role="guest",
        email_verified=False,
        email_verification_token=token,
        email_verification_expires=exp,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    await send_email_verification(user.email, user.name, token)
    access = create_access_token({"sub": str(user.id), "role": user.role})
    refresh = create_refresh_token({"sub": str(user.id), "role": user.role})
    _set_auth_cookies(response, access, refresh)
    return TokenResponse(access_token=access, refresh_token=refresh, role=user.role, name=user.name)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("15/minute;500/day")
def login(request: Request, response: Response, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    access = create_access_token({"sub": str(user.id), "role": user.role})
    refresh = create_refresh_token({"sub": str(user.id), "role": user.role})
    _set_auth_cookies(response, access, refresh)
    return TokenResponse(access_token=access, refresh_token=refresh, role=user.role, name=user.name)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute;2000/day")
def refresh_token(request: Request, response: Response, data: RefreshRequest | None = None, db: Session = Depends(get_db)):
    rt = (data.refresh_token if data else None) or request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    payload = decode_token(rt)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token({"sub": str(user.id), "role": user.role})
    refresh = create_refresh_token({"sub": str(user.id), "role": user.role})
    _set_auth_cookies(response, access, refresh)
    return TokenResponse(access_token=access, refresh_token=refresh, role=user.role, name=user.name)


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "name": current_user.name, "email": current_user.email, "phone": current_user.phone, "role": current_user.role, "email_verified": getattr(current_user, "email_verified", True)}


@router.put("/me")
def update_me(data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for field in ["name", "phone"]:
        if field in data:
            setattr(current_user, field, data[field])
    if "password" in data and data["password"]:
        if len(data["password"]) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        current_user.hashed_password = hash_password(data["password"])
    db.commit()
    db.refresh(current_user)
    return {"message": "Profile updated"}


@router.post("/verify/request")
@limiter.limit("5/minute;50/day")
async def request_verification_email(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if getattr(current_user, "email_verified", False):
        return {"message": "Email already verified"}
    token = secrets.token_urlsafe(32)
    current_user.email_verification_token = token
    current_user.email_verification_expires = datetime.utcnow() + timedelta(hours=24)
    db.commit()
    await send_email_verification(current_user.email, current_user.name, token)
    return {"message": "Verification email sent"}


@router.post("/verify")
def verify_email(data: VerifyTokenRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_verification_token == data.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    if user.email_verified:
        return {"message": "Email already verified"}
    if user.email_verification_expires and user.email_verification_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification token expired")
    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_expires = None
    db.commit()
    return {"message": "Email verified"}


@router.post("/forgot-password")
@limiter.limit("10/minute;100/day")
async def forgot_password(request: Request, data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Avoid account enumeration: always return success.
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        return {"message": "If that email exists, a reset link has been sent"}
    token = secrets.token_urlsafe(32)
    user.password_reset_token = token
    user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    await send_password_reset(user.email, user.name, token)
    return {"message": "If that email exists, a reset link has been sent"}


@router.post("/reset-password")
@limiter.limit("10/minute;100/day")
def reset_password(request: Request, data: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = db.query(User).filter(User.password_reset_token == data.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    if user.password_reset_expires and user.password_reset_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token expired")
    user.hashed_password = hash_password(data.password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    # Clear any existing auth cookies so the user signs in again with the new password.
    response = Response()
    _clear_auth_cookies(response)
    return {"message": "Password updated"}


@router.post("/logout")
def logout(response: Response):
    _clear_auth_cookies(response)
    return {"message": "Logged out"}


@router.get("/csrf")
def get_csrf(response: Response):
    """
    Allows the frontend to prime a csrf_token cookie before login.
    Safe to call unauthenticated.
    """
    secure = _cookie_secure()
    response.set_cookie(
        key=csrf_cookie_name(),
        value=secrets.token_urlsafe(24),
        httponly=False,
        secure=secure,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/",
    )
    return {"message": "CSRF cookie set"}
