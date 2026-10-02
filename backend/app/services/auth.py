"""Creating a workspace, joining one with a code, and logging in."""

import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import ConflictError, ForbiddenError, NotFoundError, UnauthorizedError
from app.models import Organization, User
from app.schemas import JoinIn, LoginIn, SignupIn
from app.security import hash_password, verify_password

# No 0/O or 1/I: join codes get read out loud and typed by hand.
JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def new_join_code() -> str:
    # secrets, not random: a guessable code would let strangers into a workspace.
    return "".join(secrets.choice(JOIN_CODE_ALPHABET) for _ in range(8))


def _ensure_email_free(db: Session, email: str) -> None:
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise ConflictError("An account with this email already exists. Try logging in instead.")


def signup(db: Session, data: SignupIn) -> User:
    """New company: creates the workspace and makes its creator the first admin."""
    _ensure_email_free(db, data.email)
    org = Organization(name=data.workspace_name, join_code=new_join_code())
    user = User(
        organization=org,
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role="admin",
        department=data.department,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def join(db: Session, data: JoinIn) -> User:
    """Teammate joins an existing workspace as a member using its join code."""
    org = db.scalar(select(Organization).where(Organization.join_code == data.join_code))
    if org is None:
        raise NotFoundError("That join code doesn't match any workspace. Check it with your admin.")
    _ensure_email_free(db, data.email)
    user = User(
        organization=org,
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role="member",
        department=data.department,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(db: Session, data: LoginIn) -> User:
    user = db.scalar(select(User).where(User.email == data.email))
    # One message for "no such email" and "wrong password", so the login form
    # can't be used to find out who has an account.
    if user is None or not verify_password(data.password, user.password_hash):
        raise UnauthorizedError("Email or password is incorrect.")
    if not user.is_active:
        raise ForbiddenError("This account has been deactivated. Contact your workspace admin.")
    return user
