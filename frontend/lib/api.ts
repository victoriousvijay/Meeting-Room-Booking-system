import type { Booking, BookingInput, BookingResult, NextSlot, Room } from "./types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      // Only send a JSON content type when there is a body; on a GET it would
      // force an unnecessary CORS preflight.
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    // fetch only rejects when no response arrived at all: server down, offline, or CORS.
    throw new ApiError("Couldn't reach the server. Check your connection and try again.", 0);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // Our API always answers errors with { detail: string }. The fallback covers
    // responses from something in front of it, like the host's own error page.
    const message =
      typeof body?.detail === "string" ? body.detail : `Request failed with status ${res.status}.`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export function listRooms() {
  return request<Room[]>("/api/rooms");
}

export function listBookings(filters: { date: string; roomId: number | null }) {
  const params = new URLSearchParams({ date: filters.date });
  if (filters.roomId !== null) params.set("room_id", String(filters.roomId));
  return request<Booking[]>(`/api/bookings?${params}`);
}

export function createBooking(input: BookingInput) {
  return request<BookingResult>("/api/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function cancelBooking(id: number) {
  return request<BookingResult>(`/api/bookings/${id}`, { method: "DELETE" });
}

export function findNextSlot(roomId: number, date: string, duration: number) {
  const params = new URLSearchParams({ date, duration: String(duration) });
  return request<NextSlot>(`/api/rooms/${roomId}/next-available?${params}`);
}

export function describeError(err: unknown): { title: string; message: string } {
  if (!(err instanceof ApiError)) {
    return { title: "Unexpected error", message: "Something went wrong. Please try again." };
  }
  const titles: Record<number, string> = {
    0: "Server unreachable",
    400: "Invalid request",
    404: "Not found",
    409: "Booking conflict",
  };
  return { title: titles[err.status] ?? "Server error", message: err.message };
}
