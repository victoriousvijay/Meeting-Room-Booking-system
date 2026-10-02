import datetime as dt
from dataclasses import dataclass

import pytest

from app.scheduling import booking_window_error, find_conflict, find_next_slot, overlaps


def t(value: str) -> dt.time:
    return dt.time.fromisoformat(value)


@dataclass
class Slot:
    start_time: dt.time
    end_time: dt.time


def slots(*ranges: str) -> list[Slot]:
    """slots("10:00-11:00", "13:00-14:00") -> list of Slot."""
    result = []
    for r in ranges:
        start, end = r.split("-")
        result.append(Slot(t(start), t(end)))
    return result


# Existing booking is 10:00-11:00 in every case below.
@pytest.mark.parametrize(
    "new_range, expected",
    [
        ("09:30-10:30", True),   # overlaps the start
        ("10:30-11:30", True),   # overlaps the end
        ("10:15-10:45", True),   # new one inside existing
        ("09:00-12:00", True),   # existing inside new one
        ("10:00-11:00", True),   # identical
        ("10:00-10:30", True),   # same start, ends earlier
        ("10:30-11:00", True),   # same end, starts later
        ("11:00-12:00", False),  # back-to-back after
        ("09:00-10:00", False),  # back-to-back before
        ("12:00-13:00", False),  # nowhere near
    ],
)
def test_overlaps(new_range, expected):
    start, end = (t(x) for x in new_range.split("-"))
    assert overlaps(start, end, t("10:00"), t("11:00")) is expected


def test_find_conflict_returns_the_clashing_booking():
    existing = slots("09:00-10:00", "13:00-14:00")
    clash = find_conflict(t("13:30"), t("15:00"), existing)
    assert clash is existing[1]


def test_find_conflict_picks_earliest_when_several_clash():
    existing = slots("14:00-15:00", "10:00-11:00")
    clash = find_conflict(t("09:00"), t("16:00"), existing)
    assert clash.start_time == t("10:00")


def test_find_conflict_none_for_back_to_back():
    assert find_conflict(t("11:00"), t("12:00"), slots("10:00-11:00", "12:00-13:00")) is None


@pytest.mark.parametrize(
    "start, end, fragment",
    [
        ("10:00", "10:00", "same time"),
        ("11:00", "10:00", "must be after"),
        ("08:30", "09:30", "working hours"),
        ("17:30", "18:30", "working hours"),
        ("07:00", "08:00", "working hours"),
    ],
)
def test_booking_window_rejects(start, end, fragment):
    assert fragment in booking_window_error(t(start), t(end))


@pytest.mark.parametrize("start, end", [("09:00", "18:00"), ("09:00", "09:15"), ("17:45", "18:00")])
def test_booking_window_accepts_edges(start, end):
    assert booking_window_error(t(start), t(end)) is None


class TestNextSlot:
    def test_empty_day_starts_at_opening(self):
        assert find_next_slot([], 45) == (t("09:00"), t("09:45"))

    def test_gap_before_first_booking(self):
        assert find_next_slot(slots("10:00-11:00"), 60) == (t("09:00"), t("10:00"))

    def test_gap_before_first_too_small(self):
        assert find_next_slot(slots("09:30-11:00"), 45) == (t("11:00"), t("11:45"))

    def test_gap_between_bookings(self):
        day = slots("09:00-10:00", "10:30-12:00", "13:00-14:00")
        assert find_next_slot(day, 60) == (t("12:00"), t("13:00"))

    def test_gap_exactly_the_duration(self):
        day = slots("09:00-10:00", "10:45-12:00")
        assert find_next_slot(day, 45) == (t("10:00"), t("10:45"))

    def test_gap_one_minute_short_is_skipped(self):
        day = slots("09:00-10:00", "10:44-12:00")
        assert find_next_slot(day, 45) == (t("12:00"), t("12:45"))

    def test_after_last_booking(self):
        assert find_next_slot(slots("09:00-16:00"), 120) == (t("16:00"), t("18:00"))

    def test_fully_booked(self):
        assert find_next_slot(slots("09:00-13:00", "13:00-18:00"), 15) is None

    def test_not_enough_room_at_end_of_day(self):
        assert find_next_slot(slots("09:00-17:30"), 45) is None

    def test_unsorted_input(self):
        day = slots("13:00-18:00", "09:00-10:00")
        assert find_next_slot(day, 60) == (t("10:00"), t("11:00"))

    def test_whole_day(self):
        assert find_next_slot([], 540) == (t("09:00"), t("18:00"))
        assert find_next_slot([], 541) is None

    def test_earliest_skips_the_past(self):
        # Searching today at 11:10: the 09:00 gap is gone, 10:00-10:30 already ended.
        day = slots("10:00-10:30", "12:00-13:00")
        assert find_next_slot(day, 30, earliest=t("11:10")) == (t("11:10"), t("11:40"))
        assert find_next_slot(day, 60, earliest=t("11:10")) == (t("13:00"), t("14:00"))

    def test_earliest_after_closing_time(self):
        assert find_next_slot([], 15, earliest=t("17:50")) is None

    def test_nested_booking_does_not_move_cursor_back(self):
        # 10:00-10:30 sits inside 09:00-12:00; the free time starts at 12:00, not 10:30.
        day = slots("09:00-12:00", "10:00-10:30")
        assert find_next_slot(day, 30) == (t("12:00"), t("12:30"))
