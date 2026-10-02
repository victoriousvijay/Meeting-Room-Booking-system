"""Booking operations: list, create (with the conflict check) and cancel."""

import datetime as dt

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.errors import BadRequestError, ConflictError, NotFoundError
from app.models import Booking
from app.scheduling import booking_window_error, find_conflict
from app.schemas import BookingCreate, BookingOut
from app.services.rooms import bookings_for_room_on, get_room


def list_bookings(
    db: Session, *, date: dt.date | None = None, room_id: int | None = None
) -> list[Booking]:
    stmt = select(Booking).options(joinedload(Booking.room))
    if date is not None:
        stmt = stmt.where(Booking.booking_date == date)
    if room_id is not None:
        stmt = stmt.where(Booking.room_id == room_id)
    stmt = stmt.order_by(Booking.booking_date, Booking.start_time, Booking.room_id)
    return list(db.scalars(stmt))


def get_booking(db: Session, booking_id: int) -> Booking:
    stmt = select(Booking).options(joinedload(Booking.room)).where(Booking.id == booking_id)
    booking = db.scalar(stmt)
    if booking is None:
        raise NotFoundError(f"Booking {booking_id} does not exist.")
    return booking


def create_booking(db: Session, data: BookingCreate) -> Booking:
    # Cheap checks first: no point touching the database for an impossible range.
    reason = booking_window_error(data.start_time, data.end_time)
    if reason:
        raise BadRequestError(reason)

    # Lock the room row until this transaction ends. Without it, two requests for
    # the same room at the same moment could both read "no conflict" and both
    # insert. With it, the second request waits, then sees the first booking.
    room = get_room(db, data.room_id, lock=True)

    existing = bookings_for_room_on(db, room.id, data.date)
    clash = find_conflict(data.start_time, data.end_time, existing)
    if clash:
        raise ConflictError(
            f"{room.name} is already booked from {clash.start_time:%H:%M} to "
            f"{clash.end_time:%H:%M} on {clash.booking_date:%Y-%m-%d} "
            f'by "{clash.title}" (booking #{clash.id}).',
            conflicting_booking=BookingOut.from_model(clash).model_dump(mode="json"),
        )

    booking = Booking(
        room_id=room.id,
        title=data.title,
        booking_date=data.date,
        start_time=data.start_time,
        end_time=data.end_time,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def cancel_booking(db: Session, booking_id: int) -> Booking:
    # Hard delete: a cancelled slot should be immediately bookable again and
    # nothing in this app needs a history of cancellations.
    booking = get_booking(db, booking_id)
    db.delete(booking)
    db.commit()
    return booking
