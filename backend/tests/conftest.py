from dataclasses import dataclass, field

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import security
from app.database import Base, get_db
from app.main import app


@pytest.fixture(autouse=True)
def fast_hashing(monkeypatch):
    # The real iteration count is slow on purpose; tests only need hashing to work.
    monkeypatch.setattr(security, "ITERATIONS", 1_000)


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

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # Not used as a context manager, so the startup hook (which talks to the
    # real database and seeds demo data) doesn't run.
    yield TestClient(app)
    app.dependency_overrides.clear()


@dataclass
class Account:
    token: str
    user: dict

    @property
    def headers(self) -> dict:
        return {"Authorization": f"Bearer {self.token}"}

    @property
    def id(self) -> int:
        return self.user["id"]


@dataclass
class Workspace:
    admin: Account
    alice: Account
    bob: Account
    join_code: str
    rooms: dict[str, int] = field(default_factory=dict)


def signup(client, workspace_name: str, email: str, name: str = "Admin") -> Account:
    res = client.post(
        "/api/auth/signup",
        json={"workspace_name": workspace_name, "name": name, "email": email, "password": "password123"},
    )
    assert res.status_code == 201, res.text
    body = res.json()
    return Account(body["token"], body["user"])


def join(client, code: str, email: str, name: str) -> Account:
    res = client.post(
        "/api/auth/join",
        json={"join_code": code, "name": name, "email": email, "password": "password123"},
    )
    assert res.status_code == 201, res.text
    body = res.json()
    return Account(body["token"], body["user"])


@pytest.fixture
def ws(client) -> Workspace:
    """A workspace with an admin, two members and three rooms."""
    admin = signup(client, "Acme", "admin@acme.test")
    code = client.get("/api/workspace", headers=admin.headers).json()["join_code"]
    workspace = Workspace(
        admin=admin,
        alice=join(client, code, "alice@acme.test", "Alice"),
        bob=join(client, code, "bob@acme.test", "Bob"),
        join_code=code,
    )
    for name, capacity in [("Ganga", 4), ("Yamuna", 6), ("Phone booth", 1)]:
        res = client.post(
            "/api/rooms",
            json={"name": name, "capacity": capacity, "location": "Floor 1", "amenities": ["Whiteboard"]},
            headers=admin.headers,
        )
        assert res.status_code == 201, res.text
        workspace.rooms[name] = res.json()["id"]
    return workspace
