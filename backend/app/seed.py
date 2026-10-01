from sqlalchemy import func, select

from app.database import Base, SessionLocal, engine
from app.models import Room

ROOMS = [
    {"name": "Orion", "capacity": 4, "location": "Floor 1 - near reception"},
    {"name": "Lyra", "capacity": 6, "location": "Floor 1 - east wing"},
    {"name": "Vega", "capacity": 8, "location": "Floor 2 - east wing"},
    {"name": "Atlas", "capacity": 12, "location": "Floor 2 - west wing"},
    {"name": "Draco", "capacity": 20, "location": "Floor 3 - boardroom"},
]


def init_db() -> None:
    # create_all only creates missing tables, so running this on every boot is
    # safe. With a single fixed schema, a migration tool would be overkill here.
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(Room)) == 0:
            db.add_all(Room(**room) for room in ROOMS)
            db.commit()


if __name__ == "__main__":
    init_db()
    print("Database ready.")
