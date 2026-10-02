// Form rules checked in the browser before a request goes out. They mirror the
// server's rules so obvious mistakes are caught instantly; the server still
// checks everything, and conflicts can only be detected there.
import { WORK_END, WORK_START, toMinutes } from "./time";

export type Errors<T> = Partial<Record<keyof T, string>>;

export type BookingForm = {
  roomId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  attendeeIds: number[];
};

export function validateBooking(form: BookingForm, capacity: number | null): Errors<BookingForm> {
  const errors: Errors<BookingForm> = {};
  const title = form.title.trim();

  if (!form.roomId) errors.roomId = "Pick a room.";
  if (!title) errors.title = "Give the meeting a title.";
  else if (title.length > 120) errors.title = "Keep the title under 120 characters.";
  if (!form.date) errors.date = "Pick a date.";
  if (!form.startTime) errors.startTime = "Pick a start time.";
  if (!form.endTime) errors.endTime = "Pick an end time.";

  if (form.startTime && form.endTime) {
    const start = toMinutes(form.startTime);
    const end = toMinutes(form.endTime);
    if (end <= start) {
      errors.endTime = "End time must be after the start time.";
    } else {
      const outside = `Must be between ${WORK_START} and ${WORK_END}.`;
      if (start < toMinutes(WORK_START)) errors.startTime = outside;
      if (end > toMinutes(WORK_END)) errors.endTime = outside;
    }
  }

  // +1 because the organiser takes a seat too.
  if (capacity !== null && form.attendeeIds.length + 1 > capacity) {
    errors.attendeeIds = `This room seats ${capacity}. Remove some people or pick a bigger room.`;
  }
  return errors;
}

export function emailError(email: string): string | undefined {
  if (!email.trim()) return "Enter your email.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return "That doesn't look like an email address.";
}

export function passwordError(password: string, { isNew }: { isNew: boolean }): string | undefined {
  if (!password) return "Enter your password.";
  if (isNew && password.length < 8) return "Use at least 8 characters.";
}

export function required(value: string, message: string): string | undefined {
  return value.trim() ? undefined : message;
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean);
}
