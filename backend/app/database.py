"""Database engine, session factory and the per-request session dependency."""

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

# psycopg prepares statements automatically after a few runs. Poolers such as
# Supabase's transaction pooler can route the next query to a different server
# connection where that prepared statement doesn't exist, so turn it off.
connect_args = {"prepare_threshold": None} if settings.sqlalchemy_url.startswith("postgresql+psycopg") else {}

# Hosted Postgres drops idle connections, so check each pooled connection
# before handing it out instead of failing the first request after a pause.
engine = create_engine(settings.sqlalchemy_url, pool_pre_ping=True, connect_args=connect_args)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
