from pydantic_settings import BaseSettings
from pydantic import EmailStr
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Rock The Yatch Booking"
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ALLOW_ORIGINS: str = ""  # comma-separated; if empty uses FRONTEND_URL in prod
    ALLOWED_HOSTS: str = "localhost,127.0.0.1,testserver"

    # Security
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "sqlite:///./yacht_booking.db"

    # Email
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@rockttheyatch.com"
    MAIL_FROM_NAME: str = "Rock The Yatch"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    # Owner seed
    OWNER_EMAIL: str = "owner@rockttheyatch.com"
    OWNER_PASSWORD: str = "SecureOwnerPass123!"
    OWNER_NAME: str = "Yacht Owner"

    # Uploads
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: str = "image/jpeg,image/png,image/webp"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    @property
    def allowed_image_types_list(self) -> List[str]:
        return [t.strip() for t in self.ALLOWED_IMAGE_TYPES.split(",")]

    @property
    def cors_allow_origins_list(self) -> List[str]:
        vals = [v.strip() for v in (self.CORS_ALLOW_ORIGINS or "").split(",") if v.strip()]
        return vals

    @property
    def allowed_hosts_list(self) -> List[str]:
        return [h.strip() for h in (self.ALLOWED_HOSTS or "").split(",") if h.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
