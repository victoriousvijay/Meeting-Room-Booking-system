import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Room
from app.seed import ROOMS


@pytest.fixture
def client():
    # In-memory SQLite keeps API tests fast and self-contained. StaticPool makes
    # every session share one connection, otherwise each would get its own empty
    # database. The row lock is a no-op on SQLite; that path is Postgres-only.
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    with TestSession() as db:
        db.add_all(Room(**room) for room in ROOMS)
        db.commit()

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # Not used as a context manager, so the startup hook (which talks to the
    # real database) doesn't run.
    yield TestClient(app)
    app.dependency_overrides.clear()
