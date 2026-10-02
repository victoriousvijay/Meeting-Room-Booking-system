"""App entry point: wires up routes, CORS and error handling."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.errors import AppError
from app.routers import auth, bookings, people, rooms, workspace
from app.seed import init_db

logger = logging.getLogger("room_booking")


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.uses_dev_secret_in_production:
        # Anyone who knows the dev secret (it's in the repo) could forge a login
        # token for any user, so refuse to start rather than run insecurely.
        raise RuntimeError("Set the JWT_SECRET environment variable before using a real database.")
    init_db()
    yield


app = FastAPI(
    title="RoomSync API",
    version="2.0.0",
    description=(
        "Meeting room booking for teams: workspaces, people, rooms and bookings "
        "between 09:00 and 18:00 without double-booking. Log in via /api/auth/login, "
        "then use the Authorize button with the returned token."
    ),
    lifespan=lifespan,
)


@app.middleware("http")
async def hide_unexpected_errors(request: Request, call_next):
    # Registered before CORS on purpose: middleware added later wraps the earlier
    # ones, so CORS still adds its headers to this 500. Using
    # exception_handler(Exception) instead would answer from outside the CORS
    # layer, and the browser would report a vague network error instead of our message.
    try:
        return await call_next(request)
    except Exception:
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Something went wrong on our side. Please try again."},
        )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def handle_app_error(_: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message, **exc.extra})


@app.exception_handler(RequestValidationError)
async def handle_validation_error(_: Request, exc: RequestValidationError):
    # FastAPI's default is 422 with a nested list that's awkward to show in a
    # toast. The brief asks for 400 on bad input, so flatten it into one sentence
    # and keep a per-field map for anyone who wants to highlight form fields.
    fields: dict[str, str] = {}
    for err in exc.errors():
        name = ".".join(str(p) for p in err["loc"] if p not in ("body", "query", "path")) or "request"
        fields[name] = err["msg"].removeprefix("Value error, ")

    detail = "; ".join(f"{name}: {msg}" for name, msg in fields.items())
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": f"Invalid input - {detail}", "fields": fields},
    )


app.include_router(auth.router)
app.include_router(rooms.router)
app.include_router(bookings.router)
app.include_router(people.router)
app.include_router(workspace.router)


@app.get("/", include_in_schema=False)
def root():
    return {"service": "roomsync", "docs": "/docs"}


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
