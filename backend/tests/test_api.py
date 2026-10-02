from tests.conftest import join, signup

DATE = "2026-09-15"


def book(client, account, room_id, start, end, title="Sync", date=DATE, attendees=()):
    return client.post(
        "/api/bookings",
        json={
            "room_id": room_id,
            "title": title,
            "date": date,
            "start_time": start,
            "end_time": end,
            "attendee_ids": list(attendees),
        },
        headers=account.headers,
    )


# ---------- auth ----------


def test_signup_makes_an_admin(client):
    account = signup(client, "Acme", "Owner@Acme.test", name="Owner")
    assert account.user["role"] == "admin"
    assert account.user["email"] == "owner@acme.test"  # normalised
    assert account.user["workspace"]["name"] == "Acme"


def test_duplicate_email_is_409(client):
    signup(client, "Acme", "a@acme.test")
    res = client.post(
        "/api/auth/signup",
        json={"workspace_name": "Other", "name": "X", "email": "a@acme.test", "password": "password123"},
    )
    assert res.status_code == 409


def test_login_and_me(client, ws):
    res = client.post("/api/auth/login", json={"email": "alice@acme.test", "password": "password123"})
    assert res.status_code == 200
    token = res.json()["token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert me["name"] == "Alice"
    assert me["role"] == "member"


def test_wrong_password_and_unknown_email_look_the_same(client, ws):
    wrong = client.post("/api/auth/login", json={"email": "alice@acme.test", "password": "nope-nope"})
    unknown = client.post("/api/auth/login", json={"email": "ghost@acme.test", "password": "nope-nope"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["detail"] == unknown.json()["detail"]


def test_requests_without_a_token_are_401(client):
    assert client.get("/api/rooms").status_code == 401
    assert client.get("/api/rooms", headers={"Authorization": "Bearer forged"}).status_code == 401


def test_bad_join_code_is_404(client):
    res = client.post(
        "/api/auth/join",
        json={"join_code": "NOPE1234", "name": "X", "email": "x@x.test", "password": "password123"},
    )
    assert res.status_code == 404


def test_short_password_is_400(client):
    res = client.post(
        "/api/auth/signup",
        json={"workspace_name": "Acme", "name": "X", "email": "x@x.test", "password": "short"},
    )
    assert res.status_code == 400
    assert "password" in res.json()["fields"]


# ---------- workspaces are isolated ----------


def test_other_workspaces_are_invisible(client, ws):
    outsider = signup(client, "Globex", "boss@globex.test")
    assert client.get("/api/rooms", headers=outsider.headers).json() == []
    ganga = ws.rooms["Ganga"]
    assert client.get(f"/api/rooms/{ganga}", headers=outsider.headers).status_code == 404
    assert book(client, outsider, ganga, "10:00", "11:00").status_code == 404


def test_cannot_invite_people_from_another_workspace(client, ws):
    outsider = signup(client, "Globex", "boss@globex.test")
    res = book(client, ws.alice, ws.rooms["Ganga"], "10:00", "11:00", attendees=[outsider.id])
    assert res.status_code == 400


# ---------- the brief's booking rules (unchanged logic) ----------


def test_create_booking(client, ws):
    res = book(client, ws.alice, ws.rooms["Ganga"], "10:00", "11:00", title="Planning", attendees=[ws.bob.id])
    assert res.status_code == 201
    booking = res.json()["booking"]
    assert booking["organizer"]["name"] == "Alice"
    assert [a["name"] for a in booking["attendees"]] == ["Bob"]
    assert booking["my_role"] == "organizer"
    assert booking["can_cancel"] is True
    assert "Planning" in res.json()["message"]


def test_conflict_names_the_existing_booking(client, ws):
    first = book(client, ws.alice, ws.rooms["Ganga"], "10:00", "11:00", title="Planning").json()["booking"]
    res = book(client, ws.bob, ws.rooms["Ganga"], "10:30", "11:30")
    assert res.status_code == 409
    assert res.json()["conflicting_booking"]["id"] == first["id"]
    assert "Planning" in res.json()["detail"]


def test_back_to_back_is_allowed(client, ws):
    room = ws.rooms["Ganga"]
    assert book(client, ws.alice, room, "10:00", "11:00").status_code == 201
    assert book(client, ws.alice, room, "11:00", "12:00").status_code == 201
    assert book(client, ws.alice, room, "09:00", "10:00").status_code == 201


def test_rejects_bad_ranges_with_400(client, ws):
    room = ws.rooms["Ganga"]
    assert book(client, ws.alice, room, "11:00", "10:00").status_code == 400
    assert book(client, ws.alice, room, "10:00", "10:00").status_code == 400
    assert book(client, ws.alice, room, "08:00", "09:30").status_code == 400
    assert "working hours" in book(client, ws.alice, room, "17:00", "18:30").json()["detail"]


def test_unknown_room_is_404(client, ws):
    assert book(client, ws.alice, 999, "10:00", "11:00").status_code == 404


# ---------- new rules ----------


def test_capacity_counts_the_organiser(client, ws):
    booth = ws.rooms["Phone booth"]  # seats 1
    assert book(client, ws.alice, booth, "10:00", "11:00").status_code == 201
    res = book(client, ws.alice, booth, "11:00", "12:00", attendees=[ws.bob.id])
    assert res.status_code == 400
    assert "seats 1" in res.json()["detail"]


def test_closed_rooms_cannot_be_booked(client, ws):
    room = ws.rooms["Yamuna"]
    client.patch(f"/api/rooms/{room}", json={"is_active": False}, headers=ws.admin.headers)
    assert book(client, ws.alice, room, "10:00", "11:00").status_code == 400
    names = [r["name"] for r in client.get("/api/rooms", headers=ws.alice.headers).json()]
    assert "Yamuna" not in names


def test_only_organiser_or_admin_can_cancel(client, ws):
    booking_id = book(client, ws.alice, ws.rooms["Ganga"], "10:00", "11:00").json()["booking"]["id"]
    assert client.delete(f"/api/bookings/{booking_id}", headers=ws.bob.headers).status_code == 403
    as_bob = client.get(f"/api/bookings/{booking_id}", headers=ws.bob.headers).json()
    assert as_bob["can_cancel"] is False

    assert client.delete(f"/api/bookings/{booking_id}", headers=ws.admin.headers).status_code == 200
    assert client.delete(f"/api/bookings/{booking_id}", headers=ws.admin.headers).status_code == 404


def test_cancelled_slot_is_free_again(client, ws):
    room = ws.rooms["Ganga"]
    booking_id = book(client, ws.alice, room, "10:00", "11:00").json()["booking"]["id"]
    client.delete(f"/api/bookings/{booking_id}", headers=ws.alice.headers)
    assert book(client, ws.bob, room, "10:00", "11:00").status_code == 201


def test_my_meetings_include_invitations(client, ws):
    book(client, ws.alice, ws.rooms["Ganga"], "10:00", "11:00", title="Alice's", attendees=[ws.bob.id])
    book(client, ws.bob, ws.rooms["Yamuna"], "10:00", "11:00", title="Bob's")
    book(client, ws.admin, ws.rooms["Yamuna"], "12:00", "13:00", title="Not Bob's")

    mine = client.get("/api/bookings/mine", params={"today": DATE}, headers=ws.bob.headers).json()
    assert {(b["title"], b["my_role"]) for b in mine} == {("Alice's", "attendee"), ("Bob's", "organizer")}

    past = client.get(
        "/api/bookings/mine", params={"scope": "past", "today": "2026-09-16"}, headers=ws.bob.headers
    ).json()
    assert len(past) == 2


def test_filters(client, ws):
    book(client, ws.alice, ws.rooms["Ganga"], "10:00", "11:00")
    book(client, ws.alice, ws.rooms["Yamuna"], "10:00", "11:00")
    book(client, ws.alice, ws.rooms["Ganga"], "10:00", "11:00", date="2026-09-16")
    h = ws.alice.headers
    assert len(client.get("/api/bookings", params={"date": DATE}, headers=h).json()) == 2
    assert len(client.get("/api/bookings", params={"room_id": ws.rooms["Ganga"]}, headers=h).json()) == 2


# ---------- availability ----------


def test_next_available(client, ws):
    room = ws.rooms["Ganga"]
    book(client, ws.alice, room, "09:00", "10:00")
    book(client, ws.alice, room, "10:45", "12:00")
    body = client.get(
        f"/api/rooms/{room}/next-available", params={"date": DATE, "duration": 45}, headers=ws.alice.headers
    ).json()
    assert (body["start_time"], body["end_time"]) == ("10:00", "10:45")


def test_next_available_fully_booked(client, ws):
    room = ws.rooms["Ganga"]
    book(client, ws.alice, room, "09:00", "18:00")
    body = client.get(
        f"/api/rooms/{room}/next-available", params={"date": DATE, "duration": 15}, headers=ws.alice.headers
    ).json()
    assert body["available"] is False


def test_available_rooms_sorted_and_filtered_by_size(client, ws):
    book(client, ws.alice, ws.rooms["Ganga"], "09:00", "10:00")
    res = client.get(
        "/api/rooms/available", params={"date": DATE, "duration": 60, "capacity": 3}, headers=ws.alice.headers
    )
    rooms = [(r["room"]["name"], r["start_time"]) for r in res.json()]
    # Phone booth is too small; Yamuna is free first; Ganga only from 10:00.
    assert rooms == [("Yamuna", "09:00"), ("Ganga", "10:00")]


def test_available_rooms_after_a_time(client, ws):
    res = client.get(
        "/api/rooms/available",
        params={"date": DATE, "duration": 30, "capacity": 1, "after": "16:20"},
        headers=ws.alice.headers,
    )
    assert {r["start_time"] for r in res.json()} == {"16:20"}


# ---------- admin-only ----------


def test_members_cannot_manage_rooms_or_people(client, ws):
    h = ws.alice.headers
    assert client.post("/api/rooms", json={"name": "X", "capacity": 2}, headers=h).status_code == 403
    assert client.patch(f"/api/people/{ws.bob.id}", json={"role": "admin"}, headers=h).status_code == 403
    assert client.get("/api/workspace/analytics", headers=h).status_code == 403


def test_room_names_unique_per_workspace(client, ws):
    res = client.post("/api/rooms", json={"name": "ganga", "capacity": 2}, headers=ws.admin.headers)
    assert res.status_code == 409
    other = signup(client, "Globex", "boss@globex.test")
    assert client.post("/api/rooms", json={"name": "Ganga", "capacity": 2}, headers=other.headers).status_code == 201


def test_deactivated_member_is_locked_out(client, ws):
    client.patch(f"/api/people/{ws.bob.id}", json={"is_active": False}, headers=ws.admin.headers)
    assert client.get("/api/rooms", headers=ws.bob.headers).status_code == 401
    res = client.post("/api/auth/login", json={"email": "bob@acme.test", "password": "password123"})
    assert res.status_code == 403


def test_admin_cannot_demote_themselves(client, ws):
    res = client.patch(f"/api/people/{ws.admin.id}", json={"role": "member"}, headers=ws.admin.headers)
    assert res.status_code == 400


def test_regenerated_join_code_replaces_the_old_one(client, ws):
    new_code = client.post("/api/workspace/join-code", headers=ws.admin.headers).json()["join_code"]
    assert new_code != ws.join_code
    res = client.post(
        "/api/auth/join",
        json={"join_code": ws.join_code, "name": "X", "email": "x@acme.test", "password": "password123"},
    )
    assert res.status_code == 404
    join(client, new_code, "x@acme.test", "X")


def test_analytics(client, ws):
    book(client, ws.alice, ws.rooms["Ganga"], "10:00", "11:00", date="2026-09-14")
    book(client, ws.bob, ws.rooms["Ganga"], "11:00", "12:30", date="2026-09-15")
    body = client.get(
        "/api/workspace/analytics", params={"days": 7, "end": DATE}, headers=ws.admin.headers
    ).json()
    assert body["total_bookings"] == 2
    assert body["booked_hours"] == 2.5
    assert body["busiest_room"] == "Ganga"
    assert len(body["per_day"]) == 7
    ganga = next(r for r in body["per_room"] if r["room_name"] == "Ganga")
    assert ganga["booked_minutes"] == 150
