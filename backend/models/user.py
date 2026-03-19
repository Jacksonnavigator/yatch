from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=True)
    role = Column(String(20), default="guest")  # "owner" | "guest"
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(255), nullable=True, index=True)
    email_verification_expires = Column(DateTime(timezone=False), nullable=True)
    password_reset_token = Column(String(255), nullable=True, index=True)
    password_reset_expires = Column(DateTime(timezone=False), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    bookings = relationship("Booking", back_populates="user", foreign_keys="Booking.user_id")
