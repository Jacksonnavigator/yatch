from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from core.config import get_settings
from typing import List
import logging

settings = get_settings()
logger = logging.getLogger(__name__)

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=bool(settings.MAIL_USERNAME),
    VALIDATE_CERTS=True,
)

fm = FastMail(conf)

def _app_link(path: str) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    if not path.startswith("/"):
        path = "/" + path
    return base + path


async def send_booking_confirmation(guest_email: str, guest_name: str, booking_ref: str, details: dict):
    extras_html = "".join(f"<li>{e}</li>" for e in details.get("extras", []))
    html = f"""
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#0a0f1e;color:#f5f0e8;padding:40px;">
      <div style="text-align:center;border-bottom:1px solid #c9a84c;padding-bottom:24px;margin-bottom:32px;">
        <h1 style="font-size:28px;font-weight:300;color:#e8c97a;">Rock The Yatch</h1>
        <p style="color:#8a8fa8;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Yacht Charter</p>
      </div>
      <h2 style="font-weight:300;font-size:22px;">Booking Request Received</h2>
      <p>Dear {guest_name},</p>
      <p>Thank you for your charter request. The owner will contact you within 24 hours to confirm and arrange payment.</p>
      <div style="background:rgba(201,168,76,0.1);border:1px solid #c9a84c;padding:24px;margin:24px 0;">
        <p style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Booking Reference</p>
        <h3 style="font-size:28px;color:#e8c97a;margin:0 0 20px;">{booking_ref}</h3>
        <table style="width:100%;font-size:13px;">
          <tr><td style="color:#8a8fa8;padding:6px 0;">Charter Type</td><td>{details.get('charter_type','')}</td></tr>
          <tr><td style="color:#8a8fa8;padding:6px 0;">Date</td><td>{details.get('date','')}</td></tr>
          <tr><td style="color:#8a8fa8;padding:6px 0;">Guests</td><td>{details.get('guests','')}</td></tr>
          <tr><td style="color:#8a8fa8;padding:6px 0;">Estimated Total</td><td style="color:#e8c97a;">${details.get('total',0):,.0f}</td></tr>
        </table>
        {"<p style='color:#8a8fa8;margin:16px 0 4px;font-size:12px;'>Add-ons:</p><ul style='margin:0;padding-left:20px;font-size:13px;'>" + extras_html + "</ul>" if extras_html else ""}
      </div>
      <p style="color:#8a8fa8;font-size:12px;">Payment is arranged directly with the owner after confirmation. No payment has been taken at this stage.</p>
      <div style="text-align:center;margin-top:40px;color:#8a8fa8;font-size:11px;letter-spacing:2px;">ROCK THE YATCH · PRIVATE CHARTER</div>
    </div>
    """
    try:
        msg = MessageSchema(subject=f"Booking Request {booking_ref} — Rock The Yatch", recipients=[guest_email], body=html, subtype=MessageType.html)
        await fm.send_message(msg)
    except Exception as e:
        logger.warning(f"Email send failed: {e}")


async def send_owner_new_booking(owner_email: str, booking_ref: str, guest_name: str, details: dict):
    html = f"""
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#0a0f1e;color:#f5f0e8;padding:40px;">
      <h2 style="color:#e8c97a;font-weight:300;">New Booking Request</h2>
      <p>A new charter request has been submitted.</p>
      <div style="background:rgba(201,168,76,0.1);border:1px solid #c9a84c;padding:24px;margin:24px 0;">
        <h3 style="color:#e8c97a;margin:0 0 16px;">{booking_ref}</h3>
        <table style="width:100%;font-size:13px;">
          <tr><td style="color:#8a8fa8;padding:6px 0;">Guest</td><td>{guest_name}</td></tr>
          <tr><td style="color:#8a8fa8;padding:6px 0;">Email</td><td>{details.get('email','')}</td></tr>
          <tr><td style="color:#8a8fa8;padding:6px 0;">Phone</td><td>{details.get('phone','')}</td></tr>
          <tr><td style="color:#8a8fa8;padding:6px 0;">Charter Type</td><td>{details.get('charter_type','')}</td></tr>
          <tr><td style="color:#8a8fa8;padding:6px 0;">Date</td><td>{details.get('date','')}</td></tr>
          <tr><td style="color:#8a8fa8;padding:6px 0;">Guests</td><td>{details.get('guests','')}</td></tr>
          <tr><td style="color:#8a8fa8;padding:6px 0;">Total</td><td style="color:#e8c97a;">${details.get('total',0):,.0f}</td></tr>
        </table>
      </div>
      <p>Log in to your dashboard to confirm or decline this booking.</p>
    </div>
    """
    try:
        msg = MessageSchema(subject=f"New Booking {booking_ref} from {guest_name}", recipients=[owner_email], body=html, subtype=MessageType.html)
        await fm.send_message(msg)
    except Exception as e:
        logger.warning(f"Owner email failed: {e}")


async def send_status_update(guest_email: str, guest_name: str, booking_ref: str, status: str):
    color = "#27ae60" if status == "confirmed" else "#c0392b"
    msg_text = "Your charter has been confirmed! The owner will be in touch shortly to arrange payment details." if status == "confirmed" else "Unfortunately your booking request has been declined. Please contact us to rebook."
    html = f"""
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#0a0f1e;color:#f5f0e8;padding:40px;">
      <h1 style="font-size:28px;font-weight:300;color:#e8c97a;">Rock The Yatch</h1>
      <h2 style="font-weight:300;">Booking {status.capitalize()}</h2>
      <p>Dear {guest_name},</p>
      <p>{msg_text}</p>
      <div style="border-left:3px solid {color};padding-left:16px;margin:24px 0;">
        <p style="color:{color};font-size:11px;letter-spacing:3px;text-transform:uppercase;">{status.upper()}</p>
        <p style="font-size:20px;color:#e8c97a;">{booking_ref}</p>
      </div>
    </div>
    """
    try:
        msg = MessageSchema(subject=f"Booking {status.capitalize()} — {booking_ref}", recipients=[guest_email], body=html, subtype=MessageType.html)
        await fm.send_message(msg)
    except Exception as e:
        logger.warning(f"Status email failed: {e}")


async def send_email_verification(email: str, name: str, token: str):
    link = _app_link(f"/verify-email?token={token}")
    html = f"""
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#0a0f1e;color:#f5f0e8;padding:40px;">
      <h1 style="font-size:28px;font-weight:300;color:#e8c97a;">Rock The Yatch</h1>
      <h2 style="font-weight:300;">Verify your email</h2>
      <p>Hi {name},</p>
      <p>Please confirm your email address to activate your account.</p>
      <p style="margin:24px 0;">
        <a href="{link}" style="display:inline-block;padding:12px 18px;border:1px solid #c9a84c;color:#0a0f1e;background:#c9a84c;text-decoration:none;letter-spacing:2px;text-transform:uppercase;font-size:11px;">Verify Email</a>
      </p>
      <p style="color:#8a8fa8;font-size:12px;">If the button doesn't work, copy and paste this link:</p>
      <p style="color:#8a8fa8;font-size:12px;word-break:break-all;">{link}</p>
    </div>
    """
    try:
        msg = MessageSchema(subject="Verify your email — Rock The Yatch", recipients=[email], body=html, subtype=MessageType.html)
        await fm.send_message(msg)
    except Exception as e:
        logger.warning(f"Verification email failed: {e}")


async def send_password_reset(email: str, name: str, token: str):
    link = _app_link(f"/reset-password?token={token}")
    html = f"""
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#0a0f1e;color:#f5f0e8;padding:40px;">
      <h1 style="font-size:28px;font-weight:300;color:#e8c97a;">Rock The Yatch</h1>
      <h2 style="font-weight:300;">Reset your password</h2>
      <p>Hi {name},</p>
      <p>We received a request to reset your password. This link expires soon.</p>
      <p style="margin:24px 0;">
        <a href="{link}" style="display:inline-block;padding:12px 18px;border:1px solid #c9a84c;color:#0a0f1e;background:#c9a84c;text-decoration:none;letter-spacing:2px;text-transform:uppercase;font-size:11px;">Reset Password</a>
      </p>
      <p style="color:#8a8fa8;font-size:12px;">If you didn't request this, you can ignore this email.</p>
      <p style="color:#8a8fa8;font-size:12px;word-break:break-all;">{link}</p>
    </div>
    """
    try:
        msg = MessageSchema(subject="Password reset — Rock The Yatch", recipients=[email], body=html, subtype=MessageType.html)
        await fm.send_message(msg)
    except Exception as e:
        logger.warning(f"Password reset email failed: {e}")
