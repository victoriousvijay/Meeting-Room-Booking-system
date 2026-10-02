"use client";

// One day at a glance: a row per room, a column per hour, bookings as blocks.
import { motion } from "framer-motion";
import { DAY_END_MIN, DAY_START_MIN, WORKING_MINUTES, fromMinutes, minutesOfDay, toMinutes } from "@/lib/time";
import type { Booking, Room } from "@/lib/types";
import { cn } from "./ui";

type Props = {
  rooms: Room[];
  bookings: Booking[];
  /** Only set when the timeline shows today, to draw the "now" line. */
  now: Date | null;
  onEmptySlot: (roomId: number, start: string, end: string) => void;
  onBooking: (booking: Booking) => void;
};

const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i); // 09:00 ... 18:00
const SNAP = 15; // minutes

function percent(minutes: number) {
  return ((minutes - DAY_START_MIN) / WORKING_MINUTES) * 100;
}

const roleStyles = {
  organizer: "bg-indigo-600 text-white hover:bg-indigo-700",
  attendee: "bg-emerald-500 text-white hover:bg-emerald-600",
  other: "bg-zinc-200 text-zinc-700 hover:bg-zinc-300",
};

export function TimelineLegend() {
  const items = [
    ["Organised by you", roleStyles.organizer],
    ["You're invited", roleStyles.attendee],
    ["Other teams", roleStyles.other],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
      {items.map(([label, style]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-sm", style)} /> {label}
        </span>
      ))}
      <span>Click an empty slot to book it.</span>
    </div>
  );
}

export default function Timeline({ rooms, bookings, now, onEmptySlot, onBooking }: Props) {
  const nowMin = now ? minutesOfDay(now) : null;
  const showNow = nowMin !== null && nowMin >= DAY_START_MIN && nowMin <= DAY_END_MIN;

  function handleRowClick(e: React.MouseEvent<HTMLDivElement>, roomId: number) {
    // Turn the click position into a time, snapped to the quarter hour, and
    // offer a 30-minute meeting from there (shorter if the day ends first).
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    const raw = DAY_START_MIN + fraction * WORKING_MINUTES;
    const start = Math.min(Math.floor(raw / SNAP) * SNAP, DAY_END_MIN - SNAP);
    const end = Math.min(start + 30, DAY_END_MIN);
    onEmptySlot(roomId, fromMinutes(start), fromMinutes(end));
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        {/* hour labels */}
        <div className="grid grid-cols-[150px_1fr]">
          <div />
          <div className="relative h-6">
            {HOURS.map((h) => (
              <span
                key={h}
                className="absolute -translate-x-1/2 text-[11px] tabular-nums text-zinc-400"
                style={{ left: `${percent(h * 60)}%` }}
              >
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>
        </div>

        {rooms.map((room) => {
          const roomBookings = bookings.filter((b) => b.room_id === room.id);
          return (
            <div key={room.id} className="grid grid-cols-[150px_1fr] border-t border-zinc-100">
              <div className="flex flex-col justify-center py-2 pr-3">
                <span className="truncate text-sm font-medium text-zinc-800">{room.name}</span>
                <span className="text-xs text-zinc-500">{room.capacity} seats</span>
              </div>
              <div
                className="group relative h-14 cursor-pointer bg-zinc-50/60 hover:bg-indigo-50/50"
                onClick={(e) => handleRowClick(e, room.id)}
                title={`Book ${room.name}`}
              >
                {HOURS.map((h) => (
                  <span
                    key={h}
                    className="pointer-events-none absolute inset-y-0 border-l border-zinc-200/70"
                    style={{ left: `${percent(h * 60)}%` }}
                  />
                ))}

                {roomBookings.map((b) => {
                  const left = percent(toMinutes(b.start_time));
                  const width = percent(toMinutes(b.end_time)) - left;
                  return (
                    <motion.button
                      key={b.id}
                      type="button"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={(e) => {
                        e.stopPropagation(); // don't also trigger "book this slot"
                        onBooking(b);
                      }}
                      className={cn(
                        "absolute inset-y-1.5 overflow-hidden rounded-md px-2 text-left text-xs shadow-sm transition",
                        roleStyles[b.my_role ?? "other"],
                      )}
                      style={{ left: `calc(${left}% + 1px)`, width: `calc(${width}% - 2px)` }}
                      title={`${b.title} · ${b.start_time}-${b.end_time} · ${b.organizer.name}`}
                    >
                      <span className="block truncate font-medium">{b.title}</span>
                      <span className="block truncate tabular-nums opacity-80">
                        {b.start_time}-{b.end_time}
                      </span>
                    </motion.button>
                  );
                })}

                {showNow && nowMin !== null && (
                  <span
                    className="pointer-events-none absolute inset-y-0 w-0.5 bg-red-500"
                    style={{ left: `${percent(nowMin)}%` }}
                    aria-hidden
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
