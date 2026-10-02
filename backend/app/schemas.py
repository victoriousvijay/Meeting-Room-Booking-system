"""Request and response shapes for the API (validated by Pydantic)."""

import datetime as dt
import re
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_serializer,
    field_validator,
)

from app.models import Booking, User
from app.permissions import can_cancel

Role = Literal["admin", "member"]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
Department = Annotated[str, StringConstraints(strip_whitespace=True, max_length=80)]
Password = Annotated[str, StringConstraints(min_length=8, max_length=128)]
Amenity = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)]


def _normalise_email(value: str) -> str:
    # Lower-cased so "Priya@X.com" and "priya@x.com" can't become two accounts.
    value = value.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
        raise ValueError("enter a valid email address")
    return value


Email = Annotated[str, Field(max_length=254), AfterValidator(_normalise_email)]


def _hhmm(value: dt.time | None) -> str | None:
    return value.strftime("%H:%M") if value else None


# ---------- auth & people ----------


class WorkspaceRef(BaseModel):
    id: int
    name: str


class MeOut(BaseModel):
    id: int
    name: str
    email: str
    role: Role
    department: str
    workspace: WorkspaceRef

    @classmethod
    def from_model(cls, user: User) -> "MeOut":
        return cls(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            department=user.department,
            workspace=WorkspaceRef(id=user.organization.id, name=user.organization.name),
        )


class AuthOut(BaseModel):
    token: str
    user: MeOut


class SignupIn(BaseModel):
    workspace_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
    name: Name
    email: Email
    password: Password
    department: Department = ""


class JoinIn(BaseModel):
    join_code: Annotated[str, StringConstraints(strip_whitespace=True, to_upper=True, min_length=4, max_length=16)]
    name: Name
    email: Email
    password: Password
    department: Department = ""


class LoginIn(BaseModel):
    email: Email
    password: Annotated[str, StringConstraints(min_length=1, max_length=128)]


class PersonRef(BaseModel):
    id: int
    name: str
    department: str


class PersonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: Role
    department: str
    is_active: bool


class PersonUpdate(BaseModel):
    role: Role | None = None
    is_active: bool | None = None
    department: Department | None = None


class WorkspaceOut(BaseModel):
    id: int
    name: str
    join_code: str
    member_count: int
    room_count: int


class WorkspaceUpdate(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]


# ---------- rooms ----------


class RoomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    capacity: int
    location: str
    amenities: list[str]
    is_active: bool


def _dedupe(values: list[str]) -> list[str]:
    # Keeps the admin's order but drops repeats like ["Projector", "projector"].
    seen: dict[str, str] = {}
    for v in values:
        seen.setdefault(v.lower(), v)
    return list(seen.values())


class RoomIn(BaseModel):
    name: Name
    capacity: int = Field(ge=1, le=500)
    location: Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)] = ""
    amenities: Annotated[list[Amenity], Field(max_length=12), AfterValidator(_dedupe)] = []


class RoomUpdate(BaseModel):
    name: Name | None = None
    capacity: int | None = Field(default=None, ge=1, le=500)
    location: Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)] | None = None
    amenities: Annotated[list[Amenity], Field(max_length=12), AfterValidator(_dedupe)] | None = None
    is_active: bool | None = None


# ---------- bookings ----------


class BookingCreate(BaseModel):
    room_id: int = Field(gt=0)
    title: Title
    date: dt.date
    start_time: dt.time = Field(examples=["10:00"])
    end_time: dt.time = Field(examples=["11:00"])
    attendee_ids: list[int] = Field(default_factory=list, max_length=100)

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
    organizer: PersonRef
    attendees: list[PersonRef]
    # From the point of view of whoever asked, so the UI can label and colour
    # "my" meetings and only show a cancel button when it would succeed.
    my_role: Literal["organizer", "attendee"] | None
    can_cancel: bool
    created_at: dt.datetime | None

    @field_serializer("start_time", "end_time")
    def hhmm(self, value: dt.time) -> str:
        return value.strftime("%H:%M")

    @classmethod
    def from_model(cls, booking: Booking, viewer: User) -> "BookingOut":
        attendee_ids = {a.id for a in booking.attendees}
        if booking.organizer_id == viewer.id:
            my_role = "organizer"
        elif viewer.id in attendee_ids:
            my_role = "attendee"
        else:
            my_role = None
        return cls(
            id=booking.id,
            room_id=booking.room_id,
            room_name=booking.room.name,
            title=booking.title,
            date=booking.booking_date,
            start_time=booking.start_time,
            end_time=booking.end_time,
            organizer=PersonRef(
                id=booking.organizer.id,
                name=booking.organizer.name,
                department=booking.organizer.department,
            ),
            attendees=[
                PersonRef(id=a.id, name=a.name, department=a.department)
                for a in sorted(booking.attendees, key=lambda a: a.name)
            ],
            my_role=my_role,
            can_cancel=can_cancel(viewer, booking),
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
        return _hhmm(value)


class AvailableRoomOut(BaseModel):
    room: RoomOut
    start_time: dt.time
    end_time: dt.time

    @field_serializer("start_time", "end_time")
    def hhmm(self, value: dt.time) -> str:
        return value.strftime("%H:%M")


# ---------- analytics ----------


class DayCount(BaseModel):
    date: dt.date
    bookings: int


class RoomUsage(BaseModel):
    room_id: int
    room_name: str
    booked_minutes: int
    utilization_pct: float


class OrganizerCount(BaseModel):
    user_id: int
    name: str
    bookings: int


class AnalyticsOut(BaseModel):
    start: dt.date
    end: dt.date
    days: int
    total_bookings: int
    booked_hours: float
    busiest_room: str | None
    per_day: list[DayCount]
    per_room: list[RoomUsage]
    top_organizers: list[OrganizerCount]


# ---------- errors ----------


class ErrorOut(BaseModel):
    detail: str


class ConflictOut(ErrorOut):
    conflicting_booking: BookingOut
