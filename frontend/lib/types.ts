// Shapes of the data the backend sends and receives (see backend/app/schemas.py).

export type Role = "admin" | "member";

export type Me = {
  id: number;
  name: string;
  email: string;
  role: Role;
  department: string;
  workspace: { id: number; name: string };
};

export type AuthResponse = { token: string; user: Me };

export type PersonRef = { id: number; name: string; department: string };

export type Person = {
  id: number;
  name: string;
  email: string;
  role: Role;
  department: string;
  is_active: boolean;
};

export type Room = {
  id: number;
  name: string;
  capacity: number;
  location: string;
  amenities: string[];
  is_active: boolean;
};

export type RoomInput = Pick<Room, "name" | "capacity" | "location" | "amenities">;

export type Booking = {
  id: number;
  room_id: number;
  room_name: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  organizer: PersonRef;
  attendees: PersonRef[];
  my_role: "organizer" | "attendee" | null;
  can_cancel: boolean;
  created_at: string | null;
};

export type BookingInput = {
  room_id: number;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  attendee_ids: number[];
};

export type BookingResult = { message: string; booking: Booking };

export type AvailableRoom = { room: Room; start_time: string; end_time: string };

export type Workspace = {
  id: number;
  name: string;
  join_code: string;
  member_count: number;
  room_count: number;
};

export type Analytics = {
  start: string;
  end: string;
  days: number;
  total_bookings: number;
  booked_hours: number;
  busiest_room: string | null;
  per_day: { date: string; bookings: number }[];
  per_room: { room_id: number; room_name: string; booked_minutes: number; utilization_pct: number }[];
  top_organizers: { user_id: number; name: string; bookings: number }[];
};
