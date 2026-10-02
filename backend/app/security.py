"""Password hashing and login tokens."""

import datetime as dt
import hashlib
import hmac
import secrets

import jwt

from app.config import settings

# OWASP's current recommendation for PBKDF2-SHA256. Slow on purpose: it makes
# guessing passwords from a leaked database expensive.
ITERATIONS = 600_000


def hash_password(password: str) -> str:
    # A random salt per user means two people with the same password still get
    # different hashes, so one cracked hash doesn't reveal the other.
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), ITERATIONS).hex()
    # The iteration count is stored with the hash so it can be raised later
    # without breaking existing passwords.
    return f"pbkdf2_sha256${ITERATIONS}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iterations, salt, digest = stored.split("$")
    except ValueError:
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(iterations)).hex()
    # compare_digest takes the same time no matter where the strings differ, so
    # response timing can't be used to guess the hash one character at a time.
    return hmac.compare_digest(candidate, digest)


def create_token(user_id: int) -> str:
    now = dt.datetime.now(dt.UTC)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + dt.timedelta(hours=settings.token_lifetime_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def read_token(token: str) -> int | None:
    """Return the user id inside a valid token, or None if it's forged or expired."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
