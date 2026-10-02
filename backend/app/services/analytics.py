"""Usage numbers for the admin analytics page."""

import datetime as dt
from collections import Counter

from sqlalchemy.orm import Session

from app.models import Booking, Room
from app.scheduling import WORKING_MINUTES, to_minutes
from app.schemas import AnalyticsOut, DayCount, OrganizerCount, RoomUsage
from app.services.bookings import bookings_in_workspace
from app.services.rooms import list_rooms


def _length(booking: Booking) -> int:
    return to_minutes(booking.end_time) - to_minutes(booking.start_time)


def workspace_analytics(db: Session, org_id: int, *, end: dt.date, days: int) -> AnalyticsOut:
    start = end - dt.timedelta(days=days - 1)
    bookings = list(
        db.scalars(
            bookings_in_workspace(org_id).where(Booking.booking_date >= start, Booking.booking_date <= end)
        )
    )
    rooms: list[Room] = list_rooms(db, org_id, include_inactive=True)

    # Every day in the range gets a bar, including days with no bookings, so the
    # chart's gaps show quiet days instead of silently skipping them.
    per_day = {start + dt.timedelta(days=i): 0 for i in range(days)}
    room_minutes: Counter[int] = Counter()
    organizers: Counter[tuple[int, str]] = Counter()
    for b in bookings:
        per_day[b.booking_date] += 1
        room_minutes[b.room_id] += _length(b)
        organizers[(b.organizer.id, b.organizer.name)] += 1

    # Utilisation = booked minutes / bookable minutes (9 hours on each day of the range).
    bookable = WORKING_MINUTES * days
    per_room = sorted(
        (
            RoomUsage(
                room_id=r.id,
                room_name=r.name,
                booked_minutes=room_minutes[r.id],
                utilization_pct=round(100 * room_minutes[r.id] / bookable, 1),
            )
            for r in rooms
        ),
        key=lambda u: u.booked_minutes,
        reverse=True,
    )

    return AnalyticsOut(
        start=start,
        end=end,
        days=days,
        total_bookings=len(bookings),
        booked_hours=round(sum(room_minutes.values()) / 60, 1),
        busiest_room=per_room[0].room_name if per_room and per_room[0].booked_minutes else None,
        per_day=[DayCount(date=d, bookings=n) for d, n in per_day.items()],
        per_room=per_room,
        top_organizers=[
            OrganizerCount(user_id=uid, name=name, bookings=n) for (uid, name), n in organizers.most_common(5)
        ],
    )
