from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


class Yacht(Base):
    __tablename__ = "yachts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), default="Rock The Yatch")
    model = Column(String(120), default="Sunseeker Predator 58")
    length_ft = Column(Integer, default=58)
    max_guests = Column(Integer, default=12)
    description = Column(Text, nullable=True)
    location = Column(String(255), default="Mediterranean & Caribbean")
    amenities = Column(JSON, default=list)
    images = Column(JSON, default=list)   # list of image file paths
    videos = Column(JSON, default=list)   # list of video file paths
    featured_image = Column(String(255), nullable=True)  # hero background image
    featured_video = Column(String(255), nullable=True)  # hero background video
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    bookings = relationship("Booking", back_populates="yacht")
    blocked_dates = relationship("BlockedDate", back_populates="yacht")
    pricing = relationship("Pricing", back_populates="yacht", uselist=False)


class Pricing(Base):
    __tablename__ = "pricing"
    id = Column(Integer, primary_key=True, index=True)
    yacht_id = Column(Integer, ForeignKey("yachts.id"), unique=True)
    full_day = Column(Float, default=3200.0)
    half_day = Column(Float, default=1800.0)
    hourly = Column(Float, default=450.0)
    daily_multi = Column(Float, default=2800.0)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    yacht = relationship("Yacht", back_populates="pricing")


class BlockedDate(Base):
    __tablename__ = "blocked_dates"
    id = Column(Integer, primary_key=True, index=True)
    yacht_id = Column(Integer, ForeignKey("yachts.id"))
    date = Column(Date, nullable=False, index=True)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    yacht = relationship("Yacht", back_populates="blocked_dates")


class Extra(Base):
    __tablename__ = "extras"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, nullable=False)
    name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    icon = Column(String(10), default="⭐")
    is_active = Column(Boolean, default=True)


class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(20), unique=True, nullable=False, index=True)
    yacht_id = Column(Integer, ForeignKey("yachts.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # Guest info (in case guest books without account)
    guest_name = Column(String(120), nullable=False)
    guest_email = Column(String(255), nullable=False)
    guest_phone = Column(String(30), nullable=True)
    # Booking details
    charter_type = Column(String(50), nullable=False)  # full_day | half_day | hourly | multi_day
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    num_guests = Column(Integer, default=1)
    extras = Column(JSON, default=list)   # list of extra keys
    notes = Column(Text, nullable=True)
    # Financials
    base_price = Column(Float, default=0.0)
    extras_price = Column(Float, default=0.0)
    total_price = Column(Float, default=0.0)
    # Status
    status = Column(String(20), default="pending")  # pending | confirmed | cancelled
    owner_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    yacht = relationship("Yacht", back_populates="bookings")
    user = relationship("User", back_populates="bookings", foreign_keys=[user_id])
