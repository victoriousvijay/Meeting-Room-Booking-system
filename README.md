# Meeting Room Booking System

Book meeting rooms for a time slot, see each room's day at a glance, cancel bookings,
and find the next free slot of a given length. Rooms can be booked between 09:00 and 18:00.

| | |
|---|---|
| Frontend (Vercel) | https://meeting-room-booking-three-eta.vercel.app |
| Backend (Render) | https://meeting-room-booking-api-pbef.onrender.com |
| API docs | https://meeting-room-booking-api-pbef.onrender.com/docs |

The backend is on Render's free tier, which sleeps when idle, so the first request after a
quiet spell can take up to a minute. The frontend shows a note while it waits.

> **Note on tooling:** this project was built with the help of Claude Code (an AI coding
> assistant), which Rustam confirmed was allowed for this assignment.

---

## Tech stack

- **Frontend:** Next.js 16 (App Router), Tailwind CSS v4, Framer Motion, Lucide icons
- **Backend:** Python, FastAPI, SQLAlchemy 2, Pydantic v2
- **Database:** PostgreSQL (Supabase, via its session pooler)
- **Hosting:** Vercel (frontend), Render (backend)

## Project structure

```
backend/
  app/
    main.py              # app setup: routes, CORS, error handling
    config.py            # settings from environment variables
    database.py          # DB engine and session per request
    models.py            # tables: rooms, bookings (+ indexes)
    schemas.py           # request/response shapes (Pydantic)
    errors.py            # errors mapped to 400 / 404 / 409
    seed.py              # creates tables and the 5 rooms on startup
    scheduling.py        # THE CORE LOGIC: overlap check, working hours, next free slot
    services/
      bookings.py        # list / create (conflict check) / cancel
      rooms.py           # list / get / next free slot
    routers/
      bookings.py        # /api/bookings endpoints (no logic, call services)
      rooms.py           # /api/rooms endpoints (no logic, call services)
  tests/
    test_scheduling.py   # every edge case of the core logic
    test_api.py          # endpoints and status codes
    conftest.py          # test client with an in-memory database
frontend/
  app/
    layout.tsx           # page shell, font, providers
    page.tsx             # renders the dashboard
  components/
    BookingDashboard.tsx # the main screen; owns state and create/cancel actions
    Filters.tsx          # date picker + room filter
    RoomCard.tsx         # one room: day bar + its bookings + cancel
    BookingModal.tsx     # new-booking form with validation
    NextSlotFinder.tsx   # "find a free slot" panel
    Toast.tsx            # toast notifications
    States.tsx           # loading skeleton, error and empty states
    Providers.tsx        # toasts + reduced-motion setting for the whole app
  hooks/
    useRooms.ts          # loads rooms
    useBookings.ts       # loads bookings for the selected date/room
  lib/
    api.ts               # every backend call + error messages
    types.ts             # data shapes shared with the backend
    time.ts              # time/date helpers, working hours
    validation.ts        # form rules (same as the backend's)
```

**How a request flows:** page (`components/`) → `lib/api.ts` → backend `routers/` →
`services/` → `scheduling.py` for the rules → database. Errors come back as
`{"detail": "..."}` and are shown in a toast.

---

## Running locally

### Backend

Needs Python 3.12+ and a PostgreSQL database. Any Postgres works. For Supabase, use the
**Session pooler** connection string: the direct connection is IPv6-only, and Render's free
tier can't reach it.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
copy .env.example .env          # macOS/Linux: cp .env.example .env
# edit .env and set DATABASE_URL
uvicorn app.main:app --reload
```

The API runs on http://localhost:8000 and the docs are at http://localhost:8000/docs.
Tables are created and rooms are seeded automatically on first start.

Run the tests (they use an in-memory SQLite database, so no Postgres is needed):

```bash
pytest
```

### Frontend

Needs Node.js 20+.

```bash
cd frontend
npm install
copy .env.example .env.local    # macOS/Linux: cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Where | Variable | Example | Purpose |
|---|---|---|---|
| backend | `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | Postgres connection. `postgres://` and `postgresql://` URLs both work. |
| backend | `CORS_ORIGINS` | `http://localhost:3000,https://my-app.vercel.app` | Comma-separated frontend origins allowed to call the API. |
| frontend | `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Base URL of the backend, no trailing slash. |

### Deployment settings

| | Setting |
|---|---|
| **Render** (web service, Python) | Build: `cd backend && pip install -r requirements.txt` · Start: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT` · Env: `PYTHON_VERSION=3.12.7`, `DATABASE_URL`, `CORS_ORIGINS` |
| **Vercel** | Root directory: `frontend` · Framework: Next.js · Env: `NEXT_PUBLIC_API_URL` |
| **Supabase** | Copy the **Session pooler** URI into Render's `DATABASE_URL` |

---

## API

| Method | Path | Description | Success |
|---|---|---|---|
| GET | `/api/rooms` | List rooms | 200 |
| GET | `/api/rooms/{id}` | One room | 200 / 404 |
| GET | `/api/rooms/{id}/next-available?date=&duration=` | Earliest free slot | 200 / 400 / 404 |
| GET | `/api/bookings?date=&room_id=` | List bookings (both filters optional) | 200 |
| POST | `/api/bookings` | Create a booking | 201 / 400 / 404 / 409 |
| GET | `/api/bookings/{id}` | One booking | 200 / 404 |
| DELETE | `/api/bookings/{id}` | Cancel a booking | 200 / 404 |

Every error has the shape `{"detail": "<message for the user>"}`. A conflict also includes
the booking that caused it:

```json
{
  "detail": "Ganga is already booked from 10:00 to 11:00 on 2026-09-15 by \"Sprint planning\" (booking #1).",
  "conflicting_booking": { "id": 1, "room_name": "Ganga", "start_time": "10:00", "end_time": "11:00", "...": "..." }
}
```

Create and cancel return `{"message": "...", "booking": {...}}`, and the frontend shows that
`message` in its toast.

---

## How the booking logic works

All the rules live in [`backend/app/scheduling.py`](backend/app/scheduling.py) as plain
functions with no database or HTTP code, so each edge case is unit-tested directly.

### Conflict detection

Bookings are treated as **half-open ranges `[start, end)`**: a meeting that ends at 11:00
frees the room at 11:00. With that rule, two bookings overlap only when each one starts
before the other ends:

```python
new_start < existing_end and existing_start < new_end
```

That one check covers every case in the brief:

| Existing 10:00-11:00, new booking | Result |
|---|---|
| 09:30-10:30 (overlaps the start) | conflict |
| 10:30-11:30 (overlaps the end) | conflict |
| 10:15-10:45 (inside) | conflict |
| 09:00-12:00 (surrounds it) | conflict |
| 10:00-11:00 (identical) | conflict |
| 11:00-12:00 (back-to-back) | **allowed**, because `11:00 < 11:00` is false |

Before the overlap check, the request is rejected with **400** if the end time is before or
equal to the start time, or if it falls outside 09:00-18:00. If the room doesn't exist the
response is **404**. A clash returns **409** naming the existing booking. If several bookings
clash, the earliest one is reported so the message doesn't depend on database row order.

**Two bookings at the same moment:** while creating a booking, the service locks the room's
row (`SELECT ... FOR UPDATE`) until the transaction ends. Without the lock, two requests could
both see "no conflict" and both insert. With it, the second waits and then sees the first
booking.

### Next available slot

The room's bookings for the day are sorted by start time. A cursor starts at 09:00 and means
"free from here":

1. For each booking: if the gap between the cursor and the booking's start is at least the
   requested duration, the cursor is the answer.
2. Otherwise, move the cursor to the end of that booking (`max(cursor, end)`, so a booking
   nested inside another can never move it backwards).
3. After the last booking, the slot fits only if `cursor + duration <= 18:00`.

- A gap **exactly** the required length is accepted (`>=`), consistent with back-to-back
  bookings being allowed.
- A **fully booked** room (or one with no gap long enough) returns `200` with
  `"available": false` and an explanation. The question was valid, the answer is just "none",
  so this isn't treated as an error.
- `duration` must be between 1 and 540 minutes (the length of the working day), otherwise
  the response is 400.

### Database

- `rooms`: id, name (unique), capacity, location
- `bookings`: id, room_id (FK), title, booking_date, start_time, end_time, created_at
- Indexes: `(room_id, booking_date)` for one room on one day, which covers the conflict
  check, the slot finder and the room+date filter, and `(booking_date)` for the main screen,
  which shows all rooms for a date.
- A `CHECK (end_time > start_time)` constraint as a final safety net.
- Row-level security is switched on for both tables. Supabase serves public tables through
  its own REST API with a public key, which would bypass the booking rules. With RLS on and
  no policies that API returns nothing, while this backend (the table owner) is unaffected.

---

## Frontend notes

- Forms are checked in the browser before anything is sent, using the same rules as the
  server. The server still checks everything, because only it can detect conflicts.
- Every action shows a toast with the server's own message: created, cancelled, conflict,
  validation error, server unreachable.
- Framer Motion is used for list items, the modal, toasts and the slot-finder result. It
  respects the operating system's "reduce motion" setting.
- Loading skeletons, an error state with retry, and empty states for rooms with no bookings.
  If loading takes more than a few seconds, a note explains that the free-tier server may be
  waking up.
- Cancelling takes two clicks, so a stray tap doesn't delete a meeting.

---

## Not done / known limitations

- **No authentication.** Anyone can book or cancel anything.
- **No migrations tool.** Tables are created with `create_all` on startup. That's fine for a
  fixed schema, but schema changes would need Alembic.
- **No editing.** A booking can be cancelled and recreated, not edited.
- **Past dates are allowed.** The brief's example date (2026-09-15) is already in the past,
  so blocking past dates would have made it untestable. Likewise, "next available" for today
  doesn't skip times that have already passed.
- **One timezone.** Times are stored as local office times with no timezone.
- **Cancel is a hard delete.** There's no history of cancelled bookings.
- **The row lock isn't covered by tests.** The API tests run on SQLite, which ignores
  `FOR UPDATE`, so concurrent booking was only reasoned about, not tested against Postgres.
- **No frontend tests.** The UI was checked by hand in the browser (desktop and mobile width).
