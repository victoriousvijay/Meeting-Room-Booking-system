"use client";

import { motion } from "framer-motion";
import { LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { WORK_END, WORK_START, formatDuration, toMinutes } from "@/lib/time";
import type { BookingInput, Room } from "@/lib/types";
import { type BookingForm, type FormErrors, validateBooking } from "@/lib/validation";

type Props = {
  rooms: Room[];
  initial: Partial<BookingForm>;
  onClose: () => void;
  onSubmit: (input: BookingInput) => Promise<boolean>;
};

const inputClass =
  "mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

// Rendered only while open (the parent wraps it in AnimatePresence), so the
// form state starts fresh from `initial` every time without a reset effect.
export default function BookingModal({ rooms, initial, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<BookingForm>({
    roomId: "",
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    ...initial,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function update<K extends keyof BookingForm>(key: K, value: BookingForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear the message as soon as the user touches the field it refers to.
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateBooking(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    const ok = await onSubmit({
      room_id: Number(form.roomId),
      title: form.title.trim(),
      date: form.date,
      start_time: form.startTime,
      end_time: form.endTime,
    });
    // On success the parent unmounts us; on failure keep the form so the user
    // can adjust the time instead of retyping everything.
    if (!ok) setSubmitting(false);
  }

  const duration =
    form.startTime && form.endTime ? toMinutes(form.endTime) - toMinutes(form.startTime) : 0;

  const border = (key: keyof BookingForm) => (errors[key] ? "border-red-400" : "border-zinc-300");

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
      <motion.div
        className="absolute inset-0 bg-zinc-900/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="booking-modal-title" className="text-base font-semibold text-zinc-900">
            New booking
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <Field label="Room" error={errors.roomId}>
            <select
              value={form.roomId}
              onChange={(e) => update("roomId", e.target.value)}
              className={`${inputClass} ${border("roomId")}`}
            >
              <option value="">Select a room</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.capacity} people)
                </option>
              ))}
            </select>
          </Field>

          <Field label="Title" error={errors.title}>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Sprint planning"
              maxLength={120}
              className={`${inputClass} ${border("title")}`}
            />
          </Field>

          <Field label="Date" error={errors.date}>
            <input
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              className={`${inputClass} ${border("date")}`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start" error={errors.startTime}>
              <input
                type="time"
                min={WORK_START}
                max={WORK_END}
                step={300}
                value={form.startTime}
                onChange={(e) => update("startTime", e.target.value)}
                className={`${inputClass} ${border("startTime")}`}
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
                className={`${inputClass} ${border("endTime")}`}
              />
            </Field>
          </div>

          <p className="text-xs text-zinc-500">
            Rooms can be booked between {WORK_START} and {WORK_END}.
            {duration > 0 && ` This booking is ${formatDuration(duration)}.`}
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              {submitting ? "Booking..." : "Book room"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
