"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarX, Clock, LoaderCircle, Search } from "lucide-react";
import { useState } from "react";
import { describeError, findNextSlot } from "@/lib/api";
import { WORK_END, WORK_START, toMinutes } from "@/lib/time";
import type { NextSlot, Room } from "@/lib/types";
import type { BookingForm } from "@/lib/validation";
import { useToast } from "./Toast";

type Props = {
  rooms: Room[];
  date: string;
  preferredRoomId: number | null;
  // Bumped by the parent after every create/cancel, so an old answer is hidden
  // once the bookings it was based on have changed.
  dataVersion: number;
  onBook: (draft: Partial<BookingForm>) => void;
};

const MAX_DURATION = toMinutes(WORK_END) - toMinutes(WORK_START);

const selectClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

export default function NextSlotFinder({ rooms, date, preferredRoomId, dataVersion, onBook }: Props) {
  const notify = useToast();
  const [pickedRoom, setPickedRoom] = useState("");
  const [duration, setDuration] = useState("45");
  const [durationError, setDurationError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [answer, setAnswer] = useState<{ key: string; slot: NextSlot } | null>(null);

  const roomId = pickedRoom || String(preferredRoomId ?? rooms[0]?.id ?? "");
  const key = `${roomId}|${date}|${duration}|${dataVersion}`;
  const slot = answer?.key === key ? answer.slot : null;

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const minutes = Number(duration);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_DURATION) {
      setDurationError(`Enter whole minutes between 1 and ${MAX_DURATION}.`);
      return;
    }
    setDurationError(null);
    setSearching(true);
    try {
      setAnswer({ key, slot: await findNextSlot(Number(roomId), date, minutes) });
    } catch (err) {
      notify({ kind: "error", ...describeError(err) });
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="flex items-center gap-2 font-semibold text-zinc-900">
        <Clock className="size-4 text-indigo-600" aria-hidden /> Find a free slot
      </h2>
      <p className="mt-1 text-xs text-zinc-500">Earliest opening on the selected date.</p>

      <form onSubmit={search} noValidate className="mt-4 space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Room</span>
          <select value={roomId} onChange={(e) => setPickedRoom(e.target.value)} className={selectClass}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Duration (minutes)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_DURATION}
            step={5}
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value);
              setDurationError(null);
            }}
            className={`${selectClass} ${durationError ? "border-red-400" : ""}`}
          />
          {durationError && <span className="mt-1 block text-xs text-red-600">{durationError}</span>}
        </label>

        <button
          type="submit"
          disabled={searching || !roomId}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
        >
          {searching ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Search className="size-4" aria-hidden />
          )}
          Find slot
        </button>
      </form>

      <AnimatePresence mode="wait">
        {slot && (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-4 rounded-lg p-3 text-sm ${
              slot.available ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"
            }`}
          >
            {slot.available && slot.start_time && slot.end_time ? (
              <>
                <p className="font-medium tabular-nums">
                  {slot.start_time}-{slot.end_time} is free
                </p>
                <p className="mt-0.5 text-xs opacity-80">{slot.message}</p>
                <button
                  type="button"
                  onClick={() =>
                    onBook({
                      roomId: String(slot.room_id),
                      date: slot.date,
                      startTime: slot.start_time ?? "",
                      endTime: slot.end_time ?? "",
                    })
                  }
                  className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Book this slot
                </button>
              </>
            ) : (
              <p className="flex items-start gap-2">
                <CalendarX className="mt-0.5 size-4 shrink-0" aria-hidden />
                {slot.message}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
