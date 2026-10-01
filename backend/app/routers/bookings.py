"""HTTP routes for /api/bookings. Each one just calls the booking service."""

import datetime as dt

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import BookingCreate, BookingOut, BookingResult, ConflictOut, ErrorOut
from app.services import bookings as booking_service

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.get("", response_model=list[BookingOut])
def list_bookings(
    date: dt.date | None = None,
    room_id: int | None = Query(None, gt=0),
    db: Session = Depends(get_db),
):
    bookings = booking_service.list_bookings(db, date=date, room_id=room_id)
    return [BookingOut.from_model(b) for b in bookings]


@router.post(
    "",
    response_model=BookingResult,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorOut}, 404: {"model": ErrorOut}, 409: {"model": ConflictOut}},
)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)):
    booking = booking_service.create_booking(db, payload)
    return BookingResult(
        message=(
            f'Booked {booking.room.name} for "{booking.title}" on '
            f"{booking.booking_date:%Y-%m-%d}, {booking.start_time:%H:%M}-{booking.end_time:%H:%M}."
        ),
        booking=BookingOut.from_model(booking),
    )


@router.get("/{booking_id}", response_model=BookingOut, responses={404: {"model": ErrorOut}})
def get_booking(booking_id: int, db: Session = Depends(get_db)):
    return BookingOut.from_model(booking_service.get_booking(db, booking_id))


@router.delete("/{booking_id}", response_model=BookingResult, responses={404: {"model": ErrorOut}})
def cancel_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = booking_service.cancel_booking(db, booking_id)
    return BookingResult(
        message=(
            f'Cancelled "{booking.title}" in {booking.room.name} on '
            f"{booking.booking_date:%Y-%m-%d}, {booking.start_time:%H:%M}-{booking.end_time:%H:%M}."
        ),
        booking=BookingOut.from_model(booking),
    )
