"""Database tables: rooms and bookings."""

import datetime as dt

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    capacity: Mapped[int]
    location: Mapped[str] = mapped_column(String(120))

    bookings: Mapped[list["Booking"]] = relationship(back_populates="room")


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        # Last line of defence if something bypasses the service layer.
        CheckConstraint("end_time > start_time", name="ck_bookings_end_after_start"),
        # Covers "one room on one day" (conflict check, next-slot, room+date filter).
        # Being composite, it also serves room-only lookups via its leading column.
        Index("ix_bookings_room_date", "room_id", "booking_date"),
        # The main screen lists every room for a single date.
        Index("ix_bookings_date", "booking_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(120))
    # "date" is a type name in SQL, so the column gets a less ambiguous name.
    booking_date: Mapped[dt.date] = mapped_column(Date)
    start_time: Mapped[dt.time] = mapped_column(Time)
    end_time: Mapped[dt.time] = mapped_column(Time)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    room: Mapped[Room] = relationship(back_populates="bookings")
