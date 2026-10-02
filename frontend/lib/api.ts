// Every call to the backend goes through this file.
import type {
  Analytics,
  AuthResponse,
  AvailableRoom,
  Booking,
  BookingInput,
  BookingResult,
  Me,
  Person,
  Role,
  Room,
  RoomInput,
  Workspace,
} from "./types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");
const TOKEN_KEY = "roomsync.token";

// Fired when the server rejects our token, so the app can send the user back to
// the login page from wherever they are.
export const SESSION_EXPIRED_EVENT = "roomsync:session-expired";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// localStorage can throw (private windows, blocked storage), and losing the
// token there should mean "logged out", not a crash.
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  },
};

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = {};
  // Only send a JSON content type when there is a body; on a GET it would
  // force an unnecessary CORS preflight.
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    // fetch only rejects when no response arrived at all: server down, offline, or CORS.
    throw new ApiError("Couldn't reach the server. Check your connection and try again.", 0);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) {
      tokenStore.clear();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    // Our API always answers errors with { detail: string }. The fallback covers
    // responses from something in front of it, like the host's own error page.
    const message =
      typeof body?.detail === "string" ? body.detail : `Request failed with status ${res.status}.`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

function query(params: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const api = {
  // auth
  signup: (input: { workspace_name: string; name: string; email: string; password: string; department: string }) =>
    request<AuthResponse>("/api/auth/signup", { method: "POST", body: input }),
  join: (input: { join_code: string; name: string; email: string; password: string; department: string }) =>
    request<AuthResponse>("/api/auth/join", { method: "POST", body: input }),
  login: (input: { email: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: input }),
  me: async () => {
    if (!tokenStore.get()) throw new ApiError("Not logged in.", 401);
    return request<Me>("/api/auth/me");
  },

  // rooms
  rooms: (includeInactive = false) => request<Room[]>(`/api/rooms${query({ include_inactive: includeInactive || null })}`),
  createRoom: (input: RoomInput) => request<Room>("/api/rooms", { method: "POST", body: input }),
  updateRoom: (id: number, patch: Partial<RoomInput> & { is_active?: boolean }) =>
    request<Room>(`/api/rooms/${id}`, { method: "PATCH", body: patch }),
  availableRooms: (params: { date: string; duration: number; capacity: number; after?: string | null }) =>
    request<AvailableRoom[]>(`/api/rooms/available${query(params)}`),

  // bookings
  bookings: (params: { date: string; roomId?: number | null }) =>
    request<Booking[]>(`/api/bookings${query({ date: params.date, room_id: params.roomId })}`),
  myBookings: (params: { scope: "upcoming" | "past"; today: string; limit?: number }) =>
    request<Booking[]>(`/api/bookings/mine${query(params)}`),
  createBooking: (input: BookingInput) => request<BookingResult>("/api/bookings", { method: "POST", body: input }),
  cancelBooking: (id: number) => request<BookingResult>(`/api/bookings/${id}`, { method: "DELETE" }),

  // people & workspace
  people: (includeInactive = false) => request<Person[]>(`/api/people${query({ include_inactive: includeInactive || null })}`),
  updatePerson: (id: number, patch: { role?: Role; is_active?: boolean; department?: string }) =>
    request<Person>(`/api/people/${id}`, { method: "PATCH", body: patch }),
  workspace: () => request<Workspace>("/api/workspace"),
  renameWorkspace: (name: string) => request<Workspace>("/api/workspace", { method: "PATCH", body: { name } }),
  regenerateJoinCode: () => request<Workspace>("/api/workspace/join-code", { method: "POST" }),
  analytics: (params: { days: number; end: string }) => request<Analytics>(`/api/workspace/analytics${query(params)}`),
};

export function describeError(err: unknown): { title: string; message: string } {
  if (!(err instanceof ApiError)) {
    return { title: "Unexpected error", message: "Something went wrong. Please try again." };
  }
  const titles: Record<number, string> = {
    0: "Server unreachable",
    400: "Check the details",
    401: "Not logged in",
    403: "Not allowed",
    404: "Not found",
    409: "Already taken",
  };
  return { title: titles[err.status] ?? "Server error", message: err.message };
}
