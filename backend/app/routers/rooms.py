"""HTTP routes for /api/rooms. Each one just checks access and calls the room service."""

import datetime as dt

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.errors import ForbiddenError
from app.models import User
from app.permissions import is_admin
from app.scheduling import WORKING_MINUTES
from app.schemas import AvailableRoomOut, ErrorOut, NextSlotOut, RoomIn, RoomOut, RoomUpdate
from app.services import rooms as room_service

router = APIRouter(prefix="/api/rooms", tags=["rooms"])

Duration = Query(gt=0, le=WORKING_MINUTES, description="Length in minutes")
After = Query(None, description="Ignore time before this, e.g. the current time when searching today")


@router.get("", response_model=list[RoomOut])
def list_rooms(
    include_inactive: bool = Query(False, description="Admins only: also list closed rooms"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if include_inactive and not is_admin(user):
        raise ForbiddenError("Only workspace admins can see closed rooms.")
    return room_service.list_rooms(db, user.org_id, include_inactive=include_inactive)


@router.post(
    "",
    response_model=RoomOut,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorOut}, 403: {"model": ErrorOut}, 409: {"model": ErrorOut}},
)
def create_room(payload: RoomIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return room_service.create_room(db, admin.org_id, payload)


# Declared before "/{room_id}" so "available" isn't read as a room id.
@router.get(
    "/available",
    response_model=list[AvailableRoomOut],
    summary="Rooms that fit a meeting, each with its earliest free slot",
)
def available_rooms(
    date: dt.date = Query(examples=["2026-09-15"]),
    duration: int = Duration,
    capacity: int = Query(1, ge=1, le=500, description="People attending, organiser included"),
    after: dt.time | None = After,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return room_service.available_rooms(db, user.org_id, date, duration, capacity, after)


@router.get("/{room_id}", response_model=RoomOut, responses={404: {"model": ErrorOut}})
def get_room(room_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return room_service.get_room(db, user.org_id, room_id)


@router.patch(
    "/{room_id}",
    response_model=RoomOut,
    responses={403: {"model": ErrorOut}, 404: {"model": ErrorOut}, 409: {"model": ErrorOut}},
)
def update_room(
    room_id: int, payload: RoomUpdate, admin: User = Depends(require_admin), db: Session = Depends(get_db)
):
    return room_service.update_room(db, admin.org_id, room_id, payload)


@router.get(
    "/{room_id}/next-available",
    response_model=NextSlotOut,
    responses={400: {"model": ErrorOut}, 404: {"model": ErrorOut}},
    summary="Earliest free slot of a given length",
    description=(
        "Returns the earliest free slot within working hours. A fully booked room "
        "is still a valid answer, so it comes back as 200 with `available: false`."
    ),
)
def next_available(
    room_id: int,
    date: dt.date = Query(examples=["2026-09-15"]),
    duration: int = Duration,
    after: dt.time | None = After,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return room_service.next_available_slot(db, user.org_id, room_id, date, duration, after)
