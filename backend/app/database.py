"""Database engine, session factory and the per-request session dependency."""

from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

# psycopg prepares statements automatically after a few runs. Poolers such as
# Supabase's transaction pooler can route the next query to a different server
# connection where that prepared statement doesn't exist, so turn it off.
connect_args = {"prepare_threshold": None} if settings.sqlalchemy_url.startswith("postgresql+psycopg") else {}

# Hosted Postgres drops idle connections, so check each pooled connection
# before handing it out instead of failing the first request after a pause.
engine = create_engine(settings.sqlalchemy_url, pool_pre_ping=True, connect_args=connect_args)

if settings.db_schema and engine.dialect.name == "postgresql":

    @event.listens_for(engine, "connect")
    def use_app_schema(dbapi_connection, _record) -> None:
        # Runs once per new connection: make sure the schema exists and point
        # unqualified table names at it, so this app never touches another
        # app's tables in "public". SET lasts for the whole connection, which
        # holds with a direct connection or Supabase's session pooler (not the
        # transaction pooler, which can swap the server connection underneath).
        with dbapi_connection.cursor() as cur:
            cur.execute(f'CREATE SCHEMA IF NOT EXISTS "{settings.db_schema}"')
            cur.execute(f'SET search_path TO "{settings.db_schema}"')
        dbapi_connection.commit()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
