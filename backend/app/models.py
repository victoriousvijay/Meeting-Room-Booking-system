"""Database tables: workspaces, users, rooms, bookings and who attends them."""

import datetime as dt

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    String,
    Table,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Organization(Base):
    """A workspace: one company's rooms, people and bookings, isolated from every other."""

    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    # Shared with teammates so they can join without an email invite system.
    join_code: Mapped[str] = mapped_column(String(16), unique=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    users: Mapped[list["User"]] = relationship(back_populates="organization")
    rooms: Mapped[list["Room"]] = relationship(back_populates="organization")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('admin', 'member')", name="ck_users_role"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    # Unique across all workspaces, so logging in only needs email + password.
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(10), default="member")
    department: Mapped[str] = mapped_column(String(80), default="")
    # Deactivated rather than deleted, so their past bookings keep a name.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organization: Mapped[Organization] = relationship(back_populates="users")


class Room(Base):
    __tablename__ = "rooms"
    # Two companies can both have a room called "Ganga"; one company can't have two.
    __table_args__ = (UniqueConstraint("org_id", "name", name="uq_rooms_org_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    capacity: Mapped[int]
    location: Mapped[str] = mapped_column(String(120))
    amenities: Mapped[list[str]] = mapped_column(JSON, default=list)
    # Closing a room for renovation shouldn't erase its booking history.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    organization: Mapped[Organization] = relationship(back_populates="rooms")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="room")


# Many-to-many: a booking invites several people, a person attends many bookings.
booking_attendees = Table(
    "booking_attendees",
    Base.metadata,
    Column("booking_id", ForeignKey("bookings.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    # The primary key already serves lookups by booking; "my meetings" looks up by user.
    Index("ix_booking_attendees_user", "user_id"),
)


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        # Last line of defence if something bypasses the service layer.
        CheckConstraint("end_time > start_time", name="ck_bookings_end_after_start"),
        # Covers "one room on one day" (conflict check, next-slot, room+date filter).
        # Being composite, it also serves room-only lookups via its leading column.
        Index("ix_bookings_room_date", "room_id", "booking_date"),
        # The dashboard and schedule list every room for a single date.
        Index("ix_bookings_date", "booking_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    organizer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    # "date" is a type name in SQL, so the column gets a less ambiguous name.
    booking_date: Mapped[dt.date] = mapped_column(Date)
    start_time: Mapped[dt.time] = mapped_column(Time)
    end_time: Mapped[dt.time] = mapped_column(Time)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    room: Mapped[Room] = relationship(back_populates="bookings")
    organizer: Mapped[User] = relationship()
    attendees: Mapped[list[User]] = relationship(secondary=booking_attendees)
