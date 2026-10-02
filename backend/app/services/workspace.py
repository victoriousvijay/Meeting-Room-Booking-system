"""Workspace settings: name and join code."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Organization, Room, User
from app.schemas import WorkspaceOut
from app.services.auth import new_join_code


def describe(db: Session, org: Organization) -> WorkspaceOut:
    members = db.scalar(
        select(func.count()).select_from(User).where(User.org_id == org.id, User.is_active.is_(True))
    )
    rooms = db.scalar(select(func.count()).select_from(Room).where(Room.org_id == org.id))
    return WorkspaceOut(
        id=org.id, name=org.name, join_code=org.join_code, member_count=members or 0, room_count=rooms or 0
    )


def rename(db: Session, org: Organization, name: str) -> Organization:
    org.name = name
    db.commit()
    return org


def regenerate_join_code(db: Session, org: Organization) -> Organization:
    # If a code leaks, a new one stops strangers joining; existing members are unaffected.
    org.join_code = new_join_code()
    db.commit()
    return org
