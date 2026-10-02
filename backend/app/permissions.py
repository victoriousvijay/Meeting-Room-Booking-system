"""Who is allowed to do what. Kept in one place so the API and the UI agree."""

from app.models import Booking, User


def is_admin(user: User) -> bool:
    return user.role == "admin"


def can_cancel(user: User, booking: Booking) -> bool:
    # Admins can clear any booking (e.g. a room needed for an emergency);
    # everyone else only their own.
    return is_admin(user) or booking.organizer_id == user.id
