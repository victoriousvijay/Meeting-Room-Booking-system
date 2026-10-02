"""Creates the tables on boot and, on an empty database, a demo workspace to explore."""

import datetime as dt

from sqlalchemy import func, select, text

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import Booking, Organization, Room, User
from app.security import hash_password

DEMO_PASSWORD = "demo1234"

PEOPLE = [
    # name, email, role, department
    ("Ananya Sharma", "ananya@nimbus.test", "admin", "Operations"),
    ("Rohan Mehta", "rohan@nimbus.test", "member", "Engineering"),
    ("Priya Iyer", "priya@nimbus.test", "member", "Design"),
    ("Arjun Singh", "arjun@nimbus.test", "member", "Sales"),
    ("Kavya Nair", "kavya@nimbus.test", "member", "People & HR"),
    ("Ishaan Gupta", "ishaan@nimbus.test", "member", "Engineering"),
]

ROOMS = [
    {"name": "Ganga", "capacity": 4, "location": "Floor 1 - near reception", "amenities": ["TV screen", "Whiteboard"]},
    {"name": "Yamuna", "capacity": 6, "location": "Floor 1 - east wing", "amenities": ["Whiteboard", "Video call"]},
    {"name": "Kaveri", "capacity": 8, "location": "Floor 2 - east wing", "amenities": ["Projector", "Whiteboard"]},
    {"name": "Narmada", "capacity": 12, "location": "Floor 2 - west wing", "amenities": ["Projector", "Video call"]},
    {"name": "Godavari", "capacity": 20, "location": "Floor 3 - boardroom", "amenities": ["Projector", "Video call", "Sound system"]},
]

# Relative to the day the database is seeded, so the dashboard has something
# on it today: (days from today, room, organiser, title, start, end, attendees).
BOOKINGS = [
    (0, 0, 1, "Daily stand-up", "09:30", "10:00", [5, 2]),
    (0, 3, 1, "Sprint planning", "10:00", "11:00", [5, 2, 0]),
    (0, 2, 2, "Design review", "11:00", "12:30", [1, 5, 0]),
    (0, 1, 3, "Client call - Tata Motors", "14:00", "14:45", [0]),
    (0, 4, 0, "Monthly all-hands", "15:00", "16:00", [1, 2, 3, 4, 5]),
    (1, 0, 0, "1:1 Ananya / Rohan", "10:00", "10:30", [1]),
    (1, 3, 4, "Hiring panel", "13:00", "14:30", [0, 1]),
    (2, 2, 2, "Brand workshop", "11:00", "13:00", [3, 4]),
    (-1, 0, 1, "Daily stand-up", "09:30", "10:00", [5, 2]),
    (-1, 4, 3, "Quarterly sales review", "14:00", "16:00", [0, 4]),
    (-2, 1, 5, "Architecture sync", "12:00", "13:00", [1]),
    (-3, 3, 0, "Budget planning", "10:00", "12:00", [3, 4]),
    (-5, 2, 4, "Onboarding session", "09:00", "11:00", [5]),
]


def init_db() -> None:
    # create_all only creates missing tables, so running this on every boot is safe.
    Base.metadata.create_all(bind=engine)

    if engine.dialect.name == "postgresql":
        # Supabase also serves every public table through its own REST API, using
        # a key that is public by design. That would let anyone skip our rules.
        # RLS with no policies closes that path; this app connects as the table
        # owner, which RLS doesn't apply to.
        with engine.begin() as conn:
            for table in Base.metadata.sorted_tables:
                conn.execute(text(f'ALTER TABLE "{table.name}" ENABLE ROW LEVEL SECURITY'))

    if settings.seed_demo_data:
        seed_demo_workspace()


def seed_demo_workspace() -> None:
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(Organization)):
            return

        org = Organization(name="Nimbus Technologies", join_code="NIMBUS26")
        # Hashed once and reused: hashing is deliberately slow.
        password_hash = hash_password(DEMO_PASSWORD)
        people = [
            User(organization=org, name=n, email=e, role=r, department=d, password_hash=password_hash)
            for n, e, r, d in PEOPLE
        ]
        rooms = [Room(organization=org, **room) for room in ROOMS]

        today = dt.date.today()
        bookings = [
            Booking(
                room=rooms[room],
                organizer=people[organizer],
                attendees=[people[i] for i in attendees],
                title=title,
                booking_date=today + dt.timedelta(days=offset),
                start_time=dt.time.fromisoformat(start),
                end_time=dt.time.fromisoformat(end),
            )
            for offset, room, organizer, title, start, end, attendees in BOOKINGS
        ]
        db.add_all([org, *people, *rooms, *bookings])
        db.commit()
