import datetime as dt
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_serializer, field_validator

from app.models import Booking

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


class RoomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    capacity: int
    location: str


class BookingCreate(BaseModel):
    room_id: int = Field(gt=0)
    title: Title
    date: dt.date
    start_time: dt.time = Field(examples=["10:00"])
    end_time: dt.time = Field(examples=["11:00"])

    @field_validator("start_time", "end_time")
    @classmethod
    def whole_minutes(cls, value: dt.time) -> dt.time:
        # The UI works in HH:MM. Rejecting seconds keeps "10:00:30" style values
        # from creating slivers of time that the slot finder would then have to
        # reason about.
        if value.second or value.microsecond:
            raise ValueError("use HH:MM, seconds are not supported")
        if value.tzinfo is not None:
            raise ValueError("send a local time without a timezone")
        return value


class BookingOut(BaseModel):
    id: int
    room_id: int
    room_name: str
    title: str
    date: dt.date
    start_time: dt.time
    end_time: dt.time
    created_at: dt.datetime | None

    @field_serializer("start_time", "end_time")
    def hhmm(self, value: dt.time) -> str:
        return value.strftime("%H:%M")

    @classmethod
    def from_model(cls, booking: Booking) -> "BookingOut":
        return cls(
            id=booking.id,
            room_id=booking.room_id,
            room_name=booking.room.name,
            title=booking.title,
            date=booking.booking_date,
            start_time=booking.start_time,
            end_time=booking.end_time,
            created_at=booking.created_at,
        )


class BookingResult(BaseModel):
    """Returned by create and cancel so the UI can show the server's own message."""

    message: str
    booking: BookingOut


class NextSlotOut(BaseModel):
    room_id: int
    room_name: str
    date: dt.date
    duration_minutes: int
    available: bool
    start_time: dt.time | None
    end_time: dt.time | None
    message: str

    @field_serializer("start_time", "end_time")
    def hhmm(self, value: dt.time | None) -> str | None:
        return value.strftime("%H:%M") if value else None


class ErrorOut(BaseModel):
    detail: str


class ConflictOut(ErrorOut):
    conflicting_booking: BookingOut
