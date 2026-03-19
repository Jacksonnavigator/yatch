from slowapi import Limiter
from slowapi.util import get_remote_address


def get_limiter(default_per_minute: int) -> Limiter:
    # slowapi supports multiple limits per endpoint; keep a global default as baseline.
    return Limiter(key_func=get_remote_address, default_limits=[f"{default_per_minute}/minute"])

