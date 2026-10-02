"""Room operations: list, manage, and find free slots."""

import datetime as dt
from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import ConflictError, NotFoundError
from app.models import Booking, Room
from app.scheduling import WORK_END, WORK_START, find_next_slot
from app.schemas import AvailableRoomOut, NextSlotOut, RoomIn, RoomOut, RoomUpdate


def list_rooms(db: Session, org_id: int, *, include_inactive: bool = False) -> list[Room]:
    stmt = select(Room).where(Room.org_id == org_id).order_by(Room.name)
    if not include_inactive:
        stmt = stmt.where(Room.is_active.is_(True))
    return list(db.scalars(stmt))


def get_room(db: Session, org_id: int, room_id: int, *, lock: bool = False) -> Room:
    # Scoped to the caller's workspace: another company's room ids look like 404s,
    # which also avoids confirming that they exist.
    stmt = select(Room).where(Room.id == room_id, Room.org_id == org_id)
    if lock:
        stmt = stmt.with_for_update()
    room = db.scalar(stmt)
    if room is None:
        raise NotFoundError(f"Room {room_id} does not exist.")
    return room


def _ensure_name_free(db: Session, org_id: int, name: str, *, except_id: int | None = None) -> None:
    stmt = select(Room.id).where(Room.org_id == org_id, func.lower(Room.name) == name.lower())
    if except_id is not None:
        stmt = stmt.where(Room.id != except_id)
    if db.scalar(stmt) is not None:
        raise ConflictError(f'A room called "{name}" already exists.')


def create_room(db: Session, org_id: int, data: RoomIn) -> Room:
    _ensure_name_free(db, org_id, data.name)
    room = Room(org_id=org_id, **data.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def update_room(db: Session, org_id: int, room_id: int, data: RoomUpdate) -> Room:
    room = get_room(db, org_id, room_id)
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes:
        _ensure_name_free(db, org_id, changes["name"], except_id=room.id)
    for field, value in changes.items():
        setattr(room, field, value)
    db.commit()
    db.refresh(room)
    return room


def bookings_for_room_on(db: Session, room_id: int, date: dt.date) -> list[Booking]:
    stmt = (
        select(Booking)
        .where(Booking.room_id == room_id, Booking.booking_date == date)
        .order_by(Booking.start_time)
    )
    return list(db.scalars(stmt))


def next_available_slot(
    db: Session, org_id: int, room_id: int, date: dt.date, duration: int, after: dt.time | None = None
) -> NextSlotOut:
    room = get_room(db, org_id, room_id)
    slot = find_next_slot(bookings_for_room_on(db, room_id, date), duration, after or WORK_START)

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


def available_rooms(
    db: Session, org_id: int, date: dt.date, duration: int, min_capacity: int, after: dt.time | None = None
) -> list[AvailableRoomOut]:
    """Every room big enough for the meeting, with its earliest free slot that day."""
    rooms = [r for r in list_rooms(db, org_id) if r.capacity >= min_capacity]
    if not rooms:
        return []

    # One query for the whole day instead of one per room.
    day_bookings = db.scalars(
        select(Booking).where(Booking.room_id.in_([r.id for r in rooms]), Booking.booking_date == date)
    )
    by_room: dict[int, list[Booking]] = defaultdict(list)
    for booking in day_bookings:
        by_room[booking.room_id].append(booking)

    results = []
    for room in rooms:
        slot = find_next_slot(by_room[room.id], duration, after or WORK_START)
        if slot:
            results.append(
                AvailableRoomOut(room=RoomOut.model_validate(room), start_time=slot[0], end_time=slot[1])
            )

    # Earliest opening first. On a tie, the smallest room that fits wins, so the
    # big rooms stay free for the big meetings.
    results.sort(key=lambda r: (r.start_time, r.room.capacity))
    return results
