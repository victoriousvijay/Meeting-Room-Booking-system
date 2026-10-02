import { WORK_END, WORK_START, toMinutes } from "./time";

export type BookingForm = {
  roomId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type FormErrors = Partial<Record<keyof BookingForm, string>>;

// Mirrors the server rules so obvious mistakes are caught without a round trip.
// The server still checks everything; conflicts can only be detected there.
export function validateBooking(form: BookingForm): FormErrors {
  const errors: FormErrors = {};
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

  return errors;
}
