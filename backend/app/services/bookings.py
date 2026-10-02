"""Booking operations: list, create (with all the checks) and cancel."""

import datetime as dt

from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.errors import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from app.models import Booking, Room, User, booking_attendees
from app.permissions import can_cancel
from app.scheduling import booking_window_error, find_conflict
from app.schemas import BookingCreate, BookingOut
from app.services.rooms import bookings_for_room_on, get_room


def bookings_in_workspace(org_id: int) -> Select[tuple[Booking]]:
    # Bookings don't store the workspace themselves; it comes through their room.
    # Loading room, organiser and attendees up front avoids one query per booking
    # when the list is turned into JSON.
    return (
        select(Booking)
        .join(Booking.room)
        .where(Room.org_id == org_id)
        .options(
            joinedload(Booking.room),
            joinedload(Booking.organizer),
            selectinload(Booking.attendees),
        )
    )


def list_bookings(
    db: Session, org_id: int, *, date: dt.date | None = None, room_id: int | None = None
) -> list[Booking]:
    stmt = bookings_in_workspace(org_id)
    if date is not None:
        stmt = stmt.where(Booking.booking_date == date)
    if room_id is not None:
        stmt = stmt.where(Booking.room_id == room_id)
    stmt = stmt.order_by(Booking.booking_date, Booking.start_time, Booking.room_id)
    return list(db.scalars(stmt))


def my_bookings(db: Session, user: User, *, upcoming: bool, today: dt.date, limit: int) -> list[Booking]:
    """Meetings the user organises or is invited to."""
    invited = select(booking_attendees.c.booking_id).where(booking_attendees.c.user_id == user.id)
    stmt = bookings_in_workspace(user.org_id).where(
        or_(Booking.organizer_id == user.id, Booking.id.in_(invited))
    )
    if upcoming:
        stmt = stmt.where(Booking.booking_date >= today).order_by(
            Booking.booking_date, Booking.start_time
        )
    else:
        # Most recent first, which is what someone scanning their history wants.
        stmt = stmt.where(Booking.booking_date < today).order_by(
            Booking.booking_date.desc(), Booking.start_time.desc()
        )
    return list(db.scalars(stmt.limit(limit)))


def get_booking(db: Session, org_id: int, booking_id: int) -> Booking:
    booking = db.scalar(bookings_in_workspace(org_id).where(Booking.id == booking_id))
    if booking is None:
        raise NotFoundError(f"Booking {booking_id} does not exist.")
    return booking


def _load_attendees(db: Session, organizer: User, attendee_ids: list[int]) -> list[User]:
    # The organiser is always present, so listing them as an attendee is ignored.
    wanted = set(attendee_ids) - {organizer.id}
    if not wanted:
        return []
    people = list(
        db.scalars(
            select(User).where(
                User.id.in_(wanted), User.org_id == organizer.org_id, User.is_active.is_(True)
            )
        )
    )
    if len(people) != len(wanted):
        raise BadRequestError("Some attendees aren't active members of your workspace.")
    return people


def create_booking(db: Session, organizer: User, data: BookingCreate) -> Booking:
    # Cheap checks first: no point touching the database for an impossible range.
    reason = booking_window_error(data.start_time, data.end_time)
    if reason:
        raise BadRequestError(reason)

    # Lock the room row until this transaction ends. Without it, two requests for
    # the same room at the same moment could both read "no conflict" and both
    # insert. With it, the second request waits, then sees the first booking.
    room = get_room(db, organizer.org_id, data.room_id, lock=True)
    if not room.is_active:
        raise BadRequestError(f"{room.name} is closed for bookings right now.")

    attendees = _load_attendees(db, organizer, data.attendee_ids)
    headcount = len(attendees) + 1  # the organiser needs a seat too
    if headcount > room.capacity:
        raise BadRequestError(
            f"{room.name} seats {room.capacity}, but this meeting has {headcount} people. "
            "Pick a bigger room or invite fewer people."
        )

    existing = bookings_for_room_on(db, room.id, data.date)
    clash = find_conflict(data.start_time, data.end_time, existing)
    if clash:
        raise ConflictError(
            f"{room.name} is already booked from {clash.start_time:%H:%M} to "
            f"{clash.end_time:%H:%M} on {clash.booking_date:%Y-%m-%d} "
            f'by "{clash.title}" (booking #{clash.id}).',
            conflicting_booking=BookingOut.from_model(clash, organizer).model_dump(mode="json"),
        )

    booking = Booking(
        room=room,
        organizer=organizer,
        attendees=attendees,
        title=data.title,
        booking_date=data.date,
        start_time=data.start_time,
        end_time=data.end_time,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def cancel_booking(db: Session, user: User, booking_id: int) -> Booking:
    booking = get_booking(db, user.org_id, booking_id)
    if not can_cancel(user, booking):
        raise ForbiddenError("Only the organiser or a workspace admin can cancel this booking.")
    # Hard delete: a cancelled slot should be immediately bookable again.
    # The attendee links are removed with it.
    db.delete(booking)
    db.commit()
    return booking
