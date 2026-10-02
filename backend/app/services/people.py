"""The people in a workspace: directory, roles and deactivation."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import BadRequestError, NotFoundError
from app.models import User
from app.schemas import PersonUpdate


def list_people(db: Session, org_id: int, *, include_inactive: bool = False) -> list[User]:
    stmt = select(User).where(User.org_id == org_id).order_by(User.name)
    if not include_inactive:
        stmt = stmt.where(User.is_active.is_(True))
    return list(db.scalars(stmt))


def get_person(db: Session, org_id: int, user_id: int) -> User:
    # Filtering by org means another company's user ids simply "don't exist" here.
    person = db.scalar(select(User).where(User.id == user_id, User.org_id == org_id))
    if person is None:
        raise NotFoundError(f"Person {user_id} is not in your workspace.")
    return person


def update_person(db: Session, admin: User, user_id: int, data: PersonUpdate) -> User:
    person = get_person(db, admin.org_id, user_id)
    if person.id == admin.id and (data.role == "member" or data.is_active is False):
        # Otherwise the only admin could lock everyone out of the admin pages.
        raise BadRequestError("You can't remove your own admin access or deactivate yourself.")

    if data.role is not None:
        person.role = data.role
    if data.is_active is not None:
        person.is_active = data.is_active
    if data.department is not None:
        person.department = data.department
    db.commit()
    db.refresh(person)
    return person
