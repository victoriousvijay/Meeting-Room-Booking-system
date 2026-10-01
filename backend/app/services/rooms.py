"""Room operations: list, look up, and find the next free slot."""

import datetime as dt

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import NotFoundError
from app.models import Booking, Room
from app.scheduling import WORK_END, WORK_START, find_next_slot
from app.schemas import NextSlotOut


def list_rooms(db: Session) -> list[Room]:
    return list(db.scalars(select(Room).order_by(Room.id)))


def get_room(db: Session, room_id: int, *, lock: bool = False) -> Room:
    stmt = select(Room).where(Room.id == room_id)
    if lock:
        stmt = stmt.with_for_update()
    room = db.scalar(stmt)
    if room is None:
        raise NotFoundError(f"Room {room_id} does not exist.")
    return room


def bookings_for_room_on(db: Session, room_id: int, date: dt.date) -> list[Booking]:
    stmt = (
        select(Booking)
        .where(Booking.room_id == room_id, Booking.booking_date == date)
        .order_by(Booking.start_time)
    )
    return list(db.scalars(stmt))


def next_available_slot(db: Session, room_id: int, date: dt.date, duration: int) -> NextSlotOut:
    room = get_room(db, room_id)
    slot = find_next_slot(bookings_for_room_on(db, room_id, date), duration)

    if slot is None:
        message = (
            f"{room.name} has no free {duration}-minute slot on {date:%Y-%m-%d} "
            f"between {WORK_START:%H:%M} and {WORK_END:%H:%M}."
        )
        start, end = None, None
    else:
        start, end = slot
        message = (
            f"Earliest free {duration}-minute slot in {room.name} on {date:%Y-%m-%d} "
            f"is {start:%H:%M}-{end:%H:%M}."
        )

    return NextSlotOut(
        room_id=room.id,
        room_name=room.name,
        date=date,
        duration_minutes=duration,
        available=slot is not None,
        start_time=start,
        end_time=end,
        message=message,
    )
