# RoomSync: meeting room booking for teams

A multi-company SaaS for booking meeting rooms. Each company gets its own workspace with
rooms, people and bookings. Members book rooms and invite colleagues; admins manage rooms
and people and see usage analytics. Overlapping bookings are impossible, and rooms can be
booked between 09:00 and 18:00.

> **Branches:** `main` is the original take-home submission (single page, no login), and
> it's what the live links below currently run. `saas` (this README) extends it into a full
> product. Its backend schema is different, so it needs a fresh database when deployed.

| | |
|---|---|
| Frontend (Vercel, `main`) | https://meeting-room-booking-three-eta.vercel.app |
| Backend (Render, `main`) | https://meeting-room-booking-api-pbef.onrender.com |
| API docs | https://meeting-room-booking-api-pbef.onrender.com/docs |

> **Note on tooling:** this project was built with the help of Claude Code (an AI coding
> assistant), which Rustam confirmed was allowed for this assignment.

---

## Features

**For everyone**
- **Dashboard:** today's meetings, rooms free right now, your meetings, room usage, a live
  timeline of every room with a "now" line, and your next meetings.
- **Schedule:** any day as a rooms × hours timeline plus an agenda list, with a room filter.
  Click an empty slot to book it; click a booking to see who's in it.
- **Find a room:** enter the length, number of people and must-have equipment, and get every
  room that fits, earliest free slot first. For today it skips times that have passed.
- **Booking with attendees:** pick a room and time and invite teammates. A live seat count
  stops you overbooking a small room.
- **My meetings:** upcoming and past meetings you organise or are invited to.
- **People directory** and **room list** with seats, location and equipment.

**For admins**
- **Rooms:** add, edit and close or reopen rooms (closed rooms keep their history but take
  no new bookings).
- **People:** make someone an admin or a member, and deactivate or reactivate them
  (deactivation takes effect immediately, even for logged-in users).
- **Analytics:** bookings per day, hours booked, utilisation per room and top organisers
  over 7, 30 or 90 days.
- **Settings:** rename the workspace, share or replace the join code.

**Accounts**
- **Sign up** creates a workspace and makes you its admin. Teammates **join** with the
  workspace's code (or an invite link with the code filled in).
- Every request is scoped to the caller's workspace, so one company can never see another's
  rooms, people or bookings.

### Demo workspace

On an empty database the backend seeds **Nimbus Technologies**: 6 people, 5 rooms (Ganga,
Yamuna, Kaveri, Narmada, Godavari) and some meetings around today. The login page has
one-click buttons for both demo accounts:

| Who | Email | Password |
|---|---|---|
| Vijay Sharma (admin) | `vijay@nimbus.test` | `demo1234` |
| Vidhi Agarwal (member) | `vidhi@nimbus.test` | `demo1234` |

Others: `shruti@`, `karan@`, `neha@`, `aman@nimbus.test` (same password). Join code:
`NIMBUS26`. These are public demo credentials; set `SEED_DEMO_DATA=false` to skip them.

---

## Tech stack

- **Frontend:** Next.js 16 (App Router), Tailwind CSS v4, Framer Motion, Lucide icons
- **Backend:** Python, FastAPI, SQLAlchemy 2, Pydantic v2, PyJWT
- **Database:** PostgreSQL (Supabase, via its session pooler)
- **Hosting:** Vercel (frontend), Render (backend)

## Project structure

```
backend/app/
  main.py              # app setup: routes, CORS, error handling, startup checks
  config.py            # settings from environment variables
  database.py          # DB engine and session per request
  models.py            # tables: organizations, users, rooms, bookings, booking_attendees
  schemas.py           # request/response shapes (Pydantic)
  errors.py            # errors mapped to 400 / 401 / 403 / 404 / 409
  security.py          # password hashing (PBKDF2) and login tokens (JWT)
  deps.py              # "who is calling" and "are they an admin" for each request
  permissions.py       # who may cancel what
  seed.py              # creates tables; seeds the demo workspace on an empty DB
  scheduling.py        # THE CORE LOGIC: overlap check, working hours, next free slot
  services/            # business logic, one file per area:
    auth.py            #   sign up, join with code, log in
    bookings.py        #   list, my meetings, create (all checks), cancel
    rooms.py           #   list, add/edit, next free slot, rooms that fit a meeting
    people.py          #   directory, roles, deactivation
    workspace.py       #   name and join code
    analytics.py       #   usage numbers
  routers/             # thin HTTP endpoints, no logic: check access, call a service
backend/tests/
  test_scheduling.py   # every edge case of the core logic
  test_api.py          # endpoints, permissions and workspace isolation
frontend/
  app/page.tsx         # landing page
  app/(auth)/          # login, signup, join
  app/(app)/           # logged-in pages (layout.tsx sends anyone else to /login):
                       #   dashboard, schedule, meetings, find, rooms, people, analytics, settings
  components/          # AppShell (sidebar), Timeline, BookingModal, BookingDetails,
                       # BookingActions (create/cancel + toasts for every page), ui.tsx (buttons,
                       # cards, modal...), Toast, States (loading/error)
  hooks/               # useQuery (loading/error/refresh), useNow (current time, per minute)
  lib/                 # api.ts (every backend call), auth.tsx (session), types, time, validation
```

**How a request flows:** page → `lib/api.ts` (adds the login token) → backend `routers/`
(checks who's calling) → `services/` → `scheduling.py` for the time rules → database.
Errors come back as `{"detail": "..."}` and are shown in a toast.

---

## How the booking logic works

All the time rules live in [`backend/app/scheduling.py`](backend/app/scheduling.py) as plain
functions with no database or HTTP code, so each edge case is unit-tested directly.

### Conflict detection

Bookings are treated as **half-open ranges `[start, end)`**: a meeting that ends at 11:00
frees the room at 11:00. With that rule, two bookings overlap only when each one starts
before the other ends:

```python
new_start < existing_end and existing_start < new_end
```

| Existing 10:00-11:00, new booking | Result |
|---|---|
| 09:30-10:30 (overlaps the start) | conflict |
| 10:30-11:30 (overlaps the end) | conflict |
| 10:15-10:45 (inside) | conflict |
| 09:00-12:00 (surrounds it) | conflict |
| 10:00-11:00 (identical) | conflict |
| 11:00-12:00 (back-to-back) | **allowed**, because `11:00 < 11:00` is false |

Creating a booking runs these checks in order:

1. End after start, and inside 09:00-18:00. Otherwise **400**.
2. The room exists in your workspace (**404**) and is open (**400**).
3. Every attendee is an active member of your workspace (**400**).
4. Headcount (attendees + organiser) fits the room's seats (**400**).
5. No overlap with an existing booking. Otherwise **409**, naming the clashing booking.

**Two bookings at the same moment:** the service locks the room's row
(`SELECT ... FOR UPDATE`) until the transaction ends, so a second request waits and then
sees the first booking instead of both getting in.

### Next available slot

The room's bookings for the day are sorted by start time. A cursor starts at 09:00 (or at
`after`, when searching today) and means "free from here":

1. For each booking: if the gap between the cursor and the booking's start is at least the
   requested duration, the cursor is the answer.
2. Otherwise, move the cursor to the end of that booking (`max(cursor, end)`, so a booking
   nested inside another can never move it backwards).
3. After the last booking, the slot fits only if `cursor + duration <= 18:00`.

A gap of **exactly** the right length is accepted (`>=`). A **fully booked** room returns
`200` with `"available": false`. **Find a room** runs the same search on every room big
enough for the meeting, in one query for the whole day, and sorts by earliest slot. On a tie,
the smallest room wins, so big rooms stay free for big meetings.

### Accounts and security

- Passwords are hashed with PBKDF2-SHA256 (600,000 iterations, random salt per user) and
  compared in constant time.
- Login returns a signed JWT (7 days). The frontend keeps it in `localStorage` and sends it
  as `Authorization: Bearer ...`. A 401 logs the user out everywhere in the app.
- The backend refuses to start against Postgres with the default development `JWT_SECRET`.
- Login gives the same error for an unknown email and a wrong password, so it can't be used
  to discover who has an account.
- Rooms, people and bookings are always filtered by the caller's workspace. Another
  workspace's ids behave as if they don't exist (404).
- Only the organiser or an admin can cancel; admins can't demote or deactivate themselves.
- Row-level security is on for every table, so Supabase's own public REST API can't be
  used to bypass these rules.

### Database

- `organizations`: name, unique join code
- `users`: workspace, name, unique email, password hash, role (`admin`/`member`), department, active
- `rooms`: workspace, name (unique per workspace), seats, location, amenities (JSON), active
- `bookings`: room, organiser, title, date, start, end
- `booking_attendees`: many-to-many link between bookings and users
- Indexes on everything the app filters by: `bookings(room_id, booking_date)`,
  `bookings(booking_date)`, `bookings(organizer_id)`, `booking_attendees(user_id)`,
  `users(org_id)`, `rooms(org_id)`
- `CHECK (end_time > start_time)` and `CHECK (role IN ('admin', 'member'))` as safety nets

---

## API

All endpoints except sign-up, join and login need `Authorization: Bearer <token>`. In
`/docs`, call `/api/auth/login`, then paste the token into **Authorize**.

| Method | Path | Who | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | anyone | Create a workspace + its admin (201) |
| POST | `/api/auth/join` | anyone | Join with a code (201) |
| POST | `/api/auth/login` | anyone | Log in (401 wrong details, 403 deactivated) |
| GET | `/api/auth/me` | member | The logged-in user |
| GET | `/api/rooms` | member | Open rooms (`?include_inactive=true` for admins) |
| POST / PATCH | `/api/rooms`, `/api/rooms/{id}` | admin | Add / edit / close a room |
| GET | `/api/rooms/available?date&duration&capacity&after` | member | Rooms that fit, with earliest slot |
| GET | `/api/rooms/{id}/next-available?date&duration&after` | member | Earliest free slot in one room |
| GET | `/api/bookings?date&room_id` | member | Bookings, filtered by date and/or room |
| GET | `/api/bookings/mine?scope=upcoming\|past&today` | member | Meetings I organise or attend |
| POST | `/api/bookings` | member | Create (201 / 400 / 404 / 409) |
| GET / DELETE | `/api/bookings/{id}` | member | View / cancel (403 if not yours) |
| GET | `/api/people` | member | Directory (`?include_inactive=true` for admins) |
| PATCH | `/api/people/{id}` | admin | Change role, department, active |
| GET / PATCH | `/api/workspace` | admin | Workspace details / rename |
| POST | `/api/workspace/join-code` | admin | Replace the join code |
| GET | `/api/workspace/analytics?days&end` | admin | Usage numbers |

Every error is `{"detail": "<message for the user>"}`, and the UI shows it as is.

---

## Running locally

> These steps run the code on your own machine, which is why the URLs are `localhost`.

### Backend (Python 3.12+)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
copy .env.example .env          # macOS/Linux: cp .env.example .env
# edit .env: DATABASE_URL (and JWT_SECRET for a real database)
uvicorn app.main:app --reload
```

API on http://localhost:8000, docs at http://localhost:8000/docs. Tests use an in-memory
SQLite database, so they need no Postgres:

```bash
pytest
```

### Frontend (Node.js 20+)

```bash
cd frontend
npm install
copy .env.example .env.local    # macOS/Linux: cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Where | Variable | Purpose |
|---|---|---|
| backend | `DATABASE_URL` | Postgres connection (`postgres://` or `postgresql://`). For Supabase use the **Session pooler** URI. |
| backend | `JWT_SECRET` | Long random string used to sign login tokens. **Required** with Postgres. |
| backend | `CORS_ORIGINS` | Comma-separated frontend origins, e.g. `https://my-app.vercel.app` |
| backend | `DB_SCHEMA` | Optional. Keeps this app's tables in their own Postgres schema (e.g. `roomsync`) so it can share a database with another app. Needs a direct connection or Supabase's **session** pooler. |
| backend | `SEED_DEMO_DATA` | `true` (default) seeds the demo workspace on an empty database |
| backend | `TOKEN_LIFETIME_HOURS` | How long a login lasts (default 168 = 7 days) |
| frontend | `NEXT_PUBLIC_API_URL` | Backend base URL, no trailing slash |

### Deploying the `saas` branch

1. Use a **new** Postgres database, or the same one as `main` with `DB_SCHEMA=roomsync`
   (the live deployment does this: both versions share one Supabase project, with the
   SaaS tables in their own `roomsync` schema). The table layouts differ, and `create_all`
   doesn't alter existing tables.
2. Render: same build/start commands as `main` (`cd backend && pip install -r requirements.txt`,
   `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`), branch `saas`, and set
   `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `PYTHON_VERSION=3.12.7`.
3. Vercel: root directory `frontend`, branch `saas`, `NEXT_PUBLIC_API_URL` = the Render URL.

---

## Not done / known limitations

- **No email.** No invite emails, password reset or email verification; teammates join with
  a code instead.
- **No migrations tool.** Schema changes need Alembic before this runs against real data.
- **No editing or recurring bookings.** A booking can be cancelled and recreated.
- **One timezone.** Times are local office times; workspaces in different timezones aren't handled.
- **Token in localStorage.** Simple and works across domains, but an XSS bug could read it.
  An httpOnly cookie on a shared domain would be safer.
- **Utilisation counts every day,** weekends included.
- **The row lock isn't covered by tests** (SQLite ignores `FOR UPDATE`).
- **No frontend tests.** The UI was checked by hand in the browser at desktop and phone widths.
