"""Settings read from environment variables (or a local .env file)."""

from pydantic_settings import BaseSettings, SettingsConfigDict

# Fine for local development only. Startup refuses it when a real Postgres
# database is configured, so a forgotten JWT_SECRET can't reach production.
DEV_JWT_SECRET = "dev-only-secret-do-not-use-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/room_booking"
    cors_origins: str = "http://localhost:3000"
    jwt_secret: str = DEV_JWT_SECRET
    token_lifetime_hours: int = 24 * 7
    seed_demo_data: bool = True

    @property
    def sqlalchemy_url(self) -> str:
        # Neon and Render hand out postgres:// or postgresql:// URLs. SQLAlchemy maps
        # those to psycopg2, but we install psycopg 3, so point it at the right driver.
        url = self.database_url
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url

    @property
    def cors_origin_list(self) -> list[str]:
        # Browsers send the Origin without a trailing slash, so strip it here;
        # a pasted "https://app.vercel.app/" would otherwise never match.
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @property
    def has_weak_secret_in_production(self) -> bool:
        # An empty or short secret is as bad as the published dev one: tokens
        # signed with it can be forged.
        weak = self.jwt_secret == DEV_JWT_SECRET or len(self.jwt_secret) < 32
        return weak and self.sqlalchemy_url.startswith("postgresql")


settings = Settings()
