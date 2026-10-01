DATE = "2026-09-15"


def book(client, start, end, room_id=1, title="Sync", date=DATE):
    return client.post(
        "/api/bookings",
        json={"room_id": room_id, "title": title, "date": date, "start_time": start, "end_time": end},
    )


def test_lists_seeded_rooms(client):
    res = client.get("/api/rooms")
    assert res.status_code == 200
    assert len(res.json()) == 5


def test_create_booking(client):
    res = book(client, "10:00", "11:00", title="Planning")
    assert res.status_code == 201
    body = res.json()
    assert body["booking"]["start_time"] == "10:00"
    assert body["booking"]["room_name"] == "Orion"
    assert "Planning" in body["message"]


def test_conflict_names_the_existing_booking(client):
    first = book(client, "10:00", "11:00", title="Planning").json()["booking"]
    res = book(client, "10:30", "11:30")
    assert res.status_code == 409
    body = res.json()
    assert body["conflicting_booking"]["id"] == first["id"]
    assert "Planning" in body["detail"]
    assert f"#{first['id']}" in body["detail"]


def test_back_to_back_is_allowed(client):
    assert book(client, "10:00", "11:00").status_code == 201
    assert book(client, "11:00", "12:00").status_code == 201
    assert book(client, "09:00", "10:00").status_code == 201


def test_same_time_in_another_room_is_allowed(client):
    assert book(client, "10:00", "11:00", room_id=1).status_code == 201
    assert book(client, "10:00", "11:00", room_id=2).status_code == 201


def test_same_time_on_another_day_is_allowed(client):
    assert book(client, "10:00", "11:00").status_code == 201
    assert book(client, "10:00", "11:00", date="2026-09-16").status_code == 201


def test_rejects_bad_ranges_with_400(client):
    assert book(client, "11:00", "10:00").status_code == 400
    assert book(client, "10:00", "10:00").status_code == 400
    assert book(client, "08:00", "09:30").status_code == 400
    res = book(client, "17:00", "18:30")
    assert res.status_code == 400
    assert "working hours" in res.json()["detail"]


def test_rejects_malformed_body_with_400(client):
    res = client.post("/api/bookings", json={"room_id": 1, "title": "  ", "date": DATE})
    assert res.status_code == 400
    assert "title" in res.json()["fields"]
    assert "start_time" in res.json()["fields"]


def test_unknown_room_is_404(client):
    res = book(client, "10:00", "11:00", room_id=99)
    assert res.status_code == 404
    assert "Room 99" in res.json()["detail"]


def test_cancel_then_slot_is_free_again(client):
    booking_id = book(client, "10:00", "11:00").json()["booking"]["id"]
    res = client.delete(f"/api/bookings/{booking_id}")
    assert res.status_code == 200
    assert "Cancelled" in res.json()["message"]
    assert client.delete(f"/api/bookings/{booking_id}").status_code == 404
    assert book(client, "10:00", "11:00").status_code == 201


def test_filters(client):
    book(client, "10:00", "11:00", room_id=1)
    book(client, "10:00", "11:00", room_id=2)
    book(client, "10:00", "11:00", room_id=1, date="2026-09-16")

    assert len(client.get("/api/bookings", params={"date": DATE}).json()) == 2
    assert len(client.get("/api/bookings", params={"room_id": 1}).json()) == 2
    assert len(client.get("/api/bookings", params={"date": DATE, "room_id": 1}).json()) == 1


def test_next_available(client):
    book(client, "09:00", "10:00")
    book(client, "10:45", "12:00")
    res = client.get("/api/rooms/1/next-available", params={"date": DATE, "duration": 45})
    assert res.status_code == 200
    body = res.json()
    assert body["available"] is True
    assert (body["start_time"], body["end_time"]) == ("10:00", "10:45")


def test_next_available_fully_booked(client):
    book(client, "09:00", "18:00")
    body = client.get("/api/rooms/1/next-available", params={"date": DATE, "duration": 15}).json()
    assert body["available"] is False
    assert body["start_time"] is None


def test_next_available_validation(client):
    assert client.get("/api/rooms/1/next-available", params={"date": DATE, "duration": 0}).status_code == 400
    assert client.get("/api/rooms/1/next-available", params={"date": DATE, "duration": 600}).status_code == 400
    assert client.get("/api/rooms/1/next-available", params={"duration": 30}).status_code == 400
    assert client.get("/api/rooms/42/next-available", params={"date": DATE, "duration": 30}).status_code == 404
