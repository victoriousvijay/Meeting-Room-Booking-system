"""HTTP routes for /api/bookings. Each one just calls the booking service."""

import datetime as dt
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Booking, User
from app.schemas import BookingCreate, BookingOut, BookingResult, ConflictOut, ErrorOut
from app.services import bookings as booking_service

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


def _describe(booking: Booking) -> str:
    return (
        f'"{booking.title}" in {booking.room.name} on {booking.booking_date:%Y-%m-%d}, '
        f"{booking.start_time:%H:%M}-{booking.end_time:%H:%M}"
    )


@router.get("", response_model=list[BookingOut])
def list_bookings(
    date: dt.date | None = None,
    room_id: int | None = Query(None, gt=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bookings = booking_service.list_bookings(db, user.org_id, date=date, room_id=room_id)
    return [BookingOut.from_model(b, user) for b in bookings]


# Declared before "/{booking_id}" so "mine" isn't read as a booking id.
@router.get("/mine", response_model=list[BookingOut], summary="Meetings I organise or am invited to")
def my_bookings(
    scope: Literal["upcoming", "past"] = "upcoming",
    # The client sends its own date: "today" depends on the user's timezone,
    # not the server's.
    today: dt.date | None = None,
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bookings = booking_service.my_bookings(
        db, user, upcoming=scope == "upcoming", today=today or dt.date.today(), limit=limit
    )
    return [BookingOut.from_model(b, user) for b in bookings]


@router.post(
    "",
    response_model=BookingResult,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorOut}, 404: {"model": ErrorOut}, 409: {"model": ConflictOut}},
)
def create_booking(payload: BookingCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    booking = booking_service.create_booking(db, user, payload)
    invited = len(booking.attendees)
    guests = f" with {invited} attendee{'s' if invited != 1 else ''}" if invited else ""
    return BookingResult(
        message=f"Booked {_describe(booking)}{guests}.",
        booking=BookingOut.from_model(booking, user),
    )


@router.get("/{booking_id}", response_model=BookingOut, responses={404: {"model": ErrorOut}})
def get_booking(booking_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return BookingOut.from_model(booking_service.get_booking(db, user.org_id, booking_id), user)


@router.delete(
    "/{booking_id}",
    response_model=BookingResult,
    responses={403: {"model": ErrorOut}, 404: {"model": ErrorOut}},
)
def cancel_booking(booking_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    booking = booking_service.cancel_booking(db, user, booking_id)
    return BookingResult(message=f"Cancelled {_describe(booking)}.", booking=BookingOut.from_model(booking, user))
