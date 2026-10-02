"""HTTP routes for /api/auth: create a workspace, join one, log in, who am I."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import AuthOut, ErrorOut, JoinIn, LoginIn, MeOut, SignupIn
from app.security import create_token
from app.services import auth as auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _session(user: User) -> AuthOut:
    return AuthOut(token=create_token(user.id), user=MeOut.from_model(user))


@router.post(
    "/signup",
    response_model=AuthOut,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorOut}, 409: {"model": ErrorOut}},
    summary="Create a new workspace and its first admin",
)
def signup(payload: SignupIn, db: Session = Depends(get_db)):
    return _session(auth_service.signup(db, payload))


@router.post(
    "/join",
    response_model=AuthOut,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorOut}, 404: {"model": ErrorOut}, 409: {"model": ErrorOut}},
    summary="Join an existing workspace with its join code",
)
def join(payload: JoinIn, db: Session = Depends(get_db)):
    return _session(auth_service.join(db, payload))


@router.post("/login", response_model=AuthOut, responses={401: {"model": ErrorOut}, 403: {"model": ErrorOut}})
def login(payload: LoginIn, db: Session = Depends(get_db)):
    return _session(auth_service.login(db, payload))


@router.get("/me", response_model=MeOut, responses={401: {"model": ErrorOut}})
def me(user: User = Depends(get_current_user)):
    return MeOut.from_model(user)
