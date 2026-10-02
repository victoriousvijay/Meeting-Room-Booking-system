// Shapes of the data the backend sends and receives (see backend/app/schemas.py).
export type Room = {
  id: number;
  name: string;
  capacity: number;
  location: string;
};

export type Booking = {
  id: number;
  room_id: number;
  room_name: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  created_at: string | null;
};

export type BookingInput = {
  room_id: number;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
};

export type BookingResult = {
  message: string;
  booking: Booking;
};

export type NextSlot = {
  room_id: number;
  room_name: string;
  date: string;
  duration_minutes: number;
  available: boolean;
  start_time: string | null;
  end_time: string | null;
  message: string;
};
