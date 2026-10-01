"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, LoaderCircle, MapPin, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { WORK_END, WORK_START, formatDuration, toMinutes } from "@/lib/time";
import type { Booking, Room } from "@/lib/types";

type Props = {
  room: Room;
  bookings: Booking[];
  cancellingId: number | null;
  onCancel: (booking: Booking) => void;
  onBook: (roomId: number) => void;
};

const DAY_START = toMinutes(WORK_START);
const DAY_LENGTH = toMinutes(WORK_END) - DAY_START;

function percentOfDay(hhmm: string) {
  return ((toMinutes(hhmm) - DAY_START) / DAY_LENGTH) * 100;
}

function DayBar({ bookings }: { bookings: Booking[] }) {
  return (
    <div aria-hidden>
      <div className="relative h-2 overflow-hidden rounded-full bg-zinc-100">
        {bookings.map((b) => (
          <span
            key={b.id}
            className="absolute inset-y-0 rounded-full bg-indigo-500/75 ring-1 ring-white"
            style={{
              left: `${percentOfDay(b.start_time)}%`,
              width: `${percentOfDay(b.end_time) - percentOfDay(b.start_time)}%`,
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-zinc-400">
        <span>{WORK_START}</span>
        <span>13:30</span>
        <span>{WORK_END}</span>
      </div>
    </div>
  );
}

export default function RoomCard({ room, bookings, cancellingId, onCancel, onBook }: Props) {
  // Cancelling is two clicks: a stray tap on the bin shouldn't delete a meeting.
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-zinc-900">{room.name}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden /> {room.capacity} people
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden /> {room.location}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onBook(room.id)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Plus className="size-3.5" aria-hidden /> Book
        </button>
      </header>

      <div className="mt-4">
        <DayBar bookings={bookings} />
      </div>

      {bookings.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center gap-2 rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-500">
          <CalendarCheck className="size-4 text-emerald-500" aria-hidden />
          No bookings - free all day.
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          <AnimatePresence initial={false}>
            {bookings.map((b) => {
              const isConfirming = confirmingId === b.id;
              const isCancelling = cancellingId === b.id;
              return (
                <motion.li
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800">{b.title}</p>
                    <p className="text-xs tabular-nums text-zinc-500">
                      {b.start_time}-{b.end_time} ·{" "}
                      {formatDuration(toMinutes(b.end_time) - toMinutes(b.start_time))}
                    </p>
                  </div>

                  {isCancelling ? (
                    <LoaderCircle className="size-4 animate-spin text-zinc-400" aria-label="Cancelling" />
                  ) : isConfirming ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingId(null);
                          onCancel(b);
                        }}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Cancel it
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200"
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(b.id)}
                      className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Cancel ${b.title}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </motion.article>
  );
}
