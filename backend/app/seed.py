"""Creates the tables and the starting rooms when the app boots."""

from sqlalchemy import func, select, text

from app.database import Base, SessionLocal, engine
from app.models import Room

ROOMS = [
    {"name": "Ganga", "capacity": 4, "location": "Floor 1 - near reception"},
    {"name": "Yamuna", "capacity": 6, "location": "Floor 1 - east wing"},
    {"name": "Kaveri", "capacity": 8, "location": "Floor 2 - east wing"},
    {"name": "Narmada", "capacity": 12, "location": "Floor 2 - west wing"},
    {"name": "Godavari", "capacity": 20, "location": "Floor 3 - boardroom"},
]


def init_db() -> None:
    # create_all only creates missing tables, so running this on every boot is
    # safe. With a single fixed schema, a migration tool would be overkill here.
    Base.metadata.create_all(bind=engine)

    if engine.dialect.name == "postgresql":
        # Supabase also serves every public table through its own REST API, using
        # a key that is public by design. That would let anyone skip our conflict
        # rules. RLS with no policies closes that path; this app connects as the
        # table owner, which RLS doesn't apply to.
        with engine.begin() as conn:
            for table in Base.metadata.sorted_tables:
                conn.execute(text(f'ALTER TABLE "{table.name}" ENABLE ROW LEVEL SECURITY'))

    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(Room)) == 0:
            db.add_all(Room(**room) for room in ROOMS)
            db.commit()
