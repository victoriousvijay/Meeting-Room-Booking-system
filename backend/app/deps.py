"""Request dependencies: who is calling, and are they allowed to."""

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import ForbiddenError, UnauthorizedError
from app.models import User
from app.permissions import is_admin
from app.security import read_token

# auto_error=False so a missing token goes through our own 401 message instead
# of FastAPI's generic one. Using HTTPBearer also adds an "Authorize" button to /docs.
bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise UnauthorizedError("Please log in to continue.")
    user_id = read_token(credentials.credentials)
    user = db.get(User, user_id) if user_id is not None else None
    # Checked on every request, so deactivating someone takes effect immediately
    # even though their token hasn't expired yet.
    if user is None or not user.is_active:
        raise UnauthorizedError("Your session has expired. Please log in again.")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not is_admin(user):
        raise ForbiddenError("Only workspace admins can do this.")
    return user
