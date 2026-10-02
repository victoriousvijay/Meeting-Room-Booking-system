"""HTTP routes for /api/people: the workspace directory and member management."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.errors import ForbiddenError
from app.models import User
from app.permissions import is_admin
from app.schemas import ErrorOut, PersonOut, PersonUpdate
from app.services import people as people_service

router = APIRouter(prefix="/api/people", tags=["people"])


@router.get("", response_model=list[PersonOut], summary="Everyone in my workspace")
def list_people(
    include_inactive: bool = Query(False, description="Admins only: also list deactivated people"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Members need the directory to pick attendees; only admins see deactivated accounts.
    if include_inactive and not is_admin(user):
        raise ForbiddenError("Only workspace admins can see deactivated people.")
    return people_service.list_people(db, user.org_id, include_inactive=include_inactive)


@router.patch(
    "/{user_id}",
    response_model=PersonOut,
    responses={400: {"model": ErrorOut}, 403: {"model": ErrorOut}, 404: {"model": ErrorOut}},
    summary="Change someone's role, department or active status",
)
def update_person(
    user_id: int, payload: PersonUpdate, admin: User = Depends(require_admin), db: Session = Depends(get_db)
):
    return people_service.update_person(db, admin, user_id, payload)
