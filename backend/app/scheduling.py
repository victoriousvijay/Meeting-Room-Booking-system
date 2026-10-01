"""Booking rules that don't depend on the database or HTTP.

Everything here works on plain times so the edge cases can be unit-tested
directly (see tests/test_scheduling.py).
"""

import datetime as dt
from collections.abc import Iterable
from typing import Protocol, TypeVar

WORK_START = dt.time(9, 0)
WORK_END = dt.time(18, 0)
WORKING_MINUTES = (WORK_END.hour - WORK_START.hour) * 60


class TimeRange(Protocol):
    start_time: dt.time
    end_time: dt.time


T = TypeVar("T", bound=TimeRange)


def to_minutes(t: dt.time) -> int:
    return t.hour * 60 + t.minute


def from_minutes(minutes: int) -> dt.time:
    return dt.time(minutes // 60, minutes % 60)


def booking_window_error(start: dt.time, end: dt.time) -> str | None:
    """Return why a start/end pair can't be booked, or None if it's fine."""
    if end == start:
        return "A booking can't start and end at the same time."
    if end < start:
        return f"End time ({end:%H:%M}) must be after start time ({start:%H:%M})."
    if start < WORK_START or end > WORK_END:
        return (
            f"Bookings must be within working hours "
            f"({WORK_START:%H:%M}-{WORK_END:%H:%M})."
        )
    return None


def overlaps(a_start: dt.time, a_end: dt.time, b_start: dt.time, b_end: dt.time) -> bool:
    # Ranges are half-open, [start, end): a meeting that ends at 11:00 frees the
    # room at 11:00. Under that rule two ranges overlap exactly when each one
    # starts before the other ends. That single check covers partial overlap at
    # either end, one range inside the other (both ways round) and identical
    # ranges, while back-to-back meetings (10-11 then 11-12) pass because
    # 11:00 < 11:00 is false. Strict "<" is what makes back-to-back legal.
    return a_start < b_end and b_start < a_end


def find_conflict(start: dt.time, end: dt.time, existing: Iterable[T]) -> T | None:
    """Return the existing booking that clashes with start-end, if any.

    If several clash, the earliest one is returned so the error message is
    stable rather than depending on database row order.
    """
    for booking in sorted(existing, key=lambda b: b.start_time):
        if overlaps(start, end, booking.start_time, booking.end_time):
            return booking
    return None


def find_next_slot(bookings: Iterable[TimeRange], duration: int) -> tuple[dt.time, dt.time] | None:
    """Earliest [start, end) of `duration` minutes that is free, or None.

    Walks the day in start-time order with a cursor marking "free from here".
    Each booking either leaves a big enough gap before it (done) or pushes the
    cursor to its end. Whatever is left after the last booking is the final gap.
    """
    cursor = to_minutes(WORK_START)
    day_end = to_minutes(WORK_END)

    for booking in sorted(bookings, key=lambda b: b.start_time):
        # ">=" so a gap exactly as long as the meeting is accepted; back-to-back
        # is allowed, so the new meeting may end right when the next one starts.
        if to_minutes(booking.start_time) - cursor >= duration:
            break
        # max() rather than a plain assignment: if a booking sits entirely inside
        # an earlier one (not possible through the API, but possible with manual
        # inserts), assigning its end would move the cursor backwards into a
        # range that is still occupied.
        cursor = max(cursor, to_minutes(booking.end_time))

    # Also covers the "fully booked" case: the cursor ends at 18:00, nothing fits.
    if cursor + duration > day_end:
        return None
    return from_minutes(cursor), from_minutes(cursor + duration)
