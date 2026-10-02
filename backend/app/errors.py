"""Errors the services raise; main.py turns them into HTTP responses."""

from typing import Any


class AppError(Exception):
    """An error whose message is safe and useful to show the end user.

    The API turns these into {"detail": message, **extra} with `status_code`.
    Anything that isn't an AppError is treated as a bug and hidden behind a 500.
    """

    status_code = 400

    def __init__(self, message: str, **extra: Any) -> None:
        super().__init__(message)
        self.message = message
        self.extra = extra


class BadRequestError(AppError):
    status_code = 400


class UnauthorizedError(AppError):
    status_code = 401


class ForbiddenError(AppError):
    status_code = 403


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409
