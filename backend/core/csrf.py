from fastapi import HTTPException, Request


def csrf_cookie_name() -> str:
    return "csrf_token"


def csrf_header_name() -> str:
    return "x-csrf-token"


def require_csrf(request: Request):
    """
    Double-submit CSRF protection.

    - Server sets a non-httpOnly cookie `csrf_token`
    - Client must echo it in `X-CSRF-Token` header for unsafe methods

    If Authorization header is present, we skip CSRF (token auth is not
    automatically attached by browsers cross-site).
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    # If the caller uses bearer token auth explicitly, treat it as API-client style.
    if request.headers.get("authorization"):
        return

    cookie_val = request.cookies.get(csrf_cookie_name())
    header_val = request.headers.get(csrf_header_name())
    if not cookie_val or not header_val or cookie_val != header_val:
        raise HTTPException(status_code=403, detail="CSRF token missing or invalid")

