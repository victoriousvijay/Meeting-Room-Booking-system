"""HTTP routes for /api/rooms. Each one just calls the room service."""

import datetime as dt

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.scheduling import WORKING_MINUTES
from app.schemas import ErrorOut, NextSlotOut, RoomOut
from app.services import rooms as room_service

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


@router.get("", response_model=list[RoomOut])
def list_rooms(db: Session = Depends(get_db)):
    return room_service.list_rooms(db)


@router.get("/{room_id}", response_model=RoomOut, responses={404: {"model": ErrorOut}})
def get_room(room_id: int, db: Session = Depends(get_db)):
    return room_service.get_room(db, room_id)


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
    duration: int = Query(gt=0, le=WORKING_MINUTES, description="Length in minutes"),
    db: Session = Depends(get_db),
):
    return room_service.next_available_slot(db, room_id, date, duration)
