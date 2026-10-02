"use client";

// The "new booking" form: room, title, time and who's invited.
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { WORK_END, WORK_START, formatDuration, toMinutes } from "@/lib/time";
import type { BookingInput, Me, Person, Room } from "@/lib/types";
import { type BookingForm, type Errors, hasErrors, validateBooking } from "@/lib/validation";
import PeoplePicker from "./PeoplePicker";
import { Button, Field, Modal, cn, fieldBorder, inputClass } from "./ui";

type Props = {
  me: Me;
  /** null while still loading. */
  rooms: Room[] | null;
  people: Person[] | null;
  loadError: string | null;
  initial: Partial<BookingForm>;
  onClose: () => void;
  onSubmit: (input: BookingInput) => Promise<boolean>;
};

export default function BookingModal({ me, rooms, people, loadError, initial, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<BookingForm>({
    roomId: "",
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    attendeeIds: [],
    ...initial,
  });
  const [errors, setErrors] = useState<Errors<BookingForm>>({});
  const [submitting, setSubmitting] = useState(false);

  const room = rooms?.find((r) => String(r.id) === form.roomId) ?? null;
  const headcount = form.attendeeIds.length + 1;
  const duration = form.startTime && form.endTime ? toMinutes(form.endTime) - toMinutes(form.startTime) : 0;

  function update<K extends keyof BookingForm>(key: K, value: BookingForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear the message as soon as the user touches the field it refers to.
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateBooking(form, room?.capacity ?? null);
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    const ok = await onSubmit({
      room_id: Number(form.roomId),
      title: form.title.trim(),
      date: form.date,
      start_time: form.startTime,
      end_time: form.endTime,
      attendee_ids: form.attendeeIds,
    });
    // On success the parent closes us; on failure keep the form so the user can
    // adjust the time instead of retyping everything.
    if (!ok) setSubmitting(false);
  }

  // One modal for both states: swapping a loading modal for the form inside
  // AnimatePresence left the first one stuck on screen, invisible but blocking clicks.
  if (!rooms || !people) {
    return (
      <Modal title="New booking" onClose={onClose} wide>
        {loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : (
          <div className="flex justify-center py-10">
            <LoaderCircle className="size-6 animate-spin text-indigo-600" aria-label="Loading" />
          </div>
        )}
      </Modal>
    );
  }

  return (
    <Modal title="New booking" onClose={onClose} wide>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Title" error={errors.title}>
          <input
            autoFocus
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Sprint planning"
            maxLength={120}
            className={cn(inputClass, fieldBorder(errors.title))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Room" error={errors.roomId}>
            <select
              value={form.roomId}
              onChange={(e) => update("roomId", e.target.value)}
              className={cn(inputClass, fieldBorder(errors.roomId))}
            >
              <option value="">Select a room</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.capacity} seats
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date" error={errors.date}>
            <input
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              className={cn(inputClass, fieldBorder(errors.date))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start" error={errors.startTime}>
            <input
              type="time"
              min={WORK_START}
              max={WORK_END}
              step={300}
              value={form.startTime}
              onChange={(e) => update("startTime", e.target.value)}
              className={cn(inputClass, fieldBorder(errors.startTime))}
            />
          </Field>
          <Field label="End" error={errors.endTime}>
            <input
              type="time"
              min={WORK_START}
              max={WORK_END}
              step={300}
              value={form.endTime}
              onChange={(e) => update("endTime", e.target.value)}
              className={cn(inputClass, fieldBorder(errors.endTime))}
            />
          </Field>
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm font-medium text-zinc-700">Attendees</span>
            {room && (
              <span className={cn("text-xs tabular-nums", headcount > room.capacity ? "text-red-600" : "text-zinc-500")}>
                {headcount} of {room.capacity} seats (you included)
              </span>
            )}
          </div>
          <PeoplePicker
            people={people.filter((p) => p.id !== me.id)}
            value={form.attendeeIds}
            onChange={(ids) => update("attendeeIds", ids)}
          />
          {errors.attendeeIds && <p className="mt-1 text-xs text-red-600">{errors.attendeeIds}</p>}
        </div>

        <p className="text-xs text-zinc-500">
          Rooms can be booked between {WORK_START} and {WORK_END}.
          {duration > 0 && ` This meeting is ${formatDuration(duration)}.`}
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {submitting ? "Booking..." : "Book room"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
