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
  organizer:
    "bg-gradient-to-b from-indigo-400 to-indigo-600 text-white shadow-indigo-500/30 ring-indigo-300/40 hover:shadow-indigo-500/50",
  attendee:
    "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-emerald-500/25 ring-emerald-300/40 hover:shadow-emerald-500/45",
  other: "bg-white/[0.09] text-white/80 shadow-black/20 ring-white/15 hover:bg-white/[0.14]",
};

const legendDots = {
  organizer: "bg-indigo-500",
  attendee: "bg-emerald-500",
  other: "bg-white/25",
};

export function TimelineLegend() {
  const items: [string, keyof typeof legendDots][] = [
    ["Organised by you", "organizer"],
    ["You're invited", "attendee"],
    ["Other teams", "other"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-white/45">
      {items.map(([label, kind]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", legendDots[kind])} /> {label}
        </span>
      ))}
      <span className="text-white/30">Click an empty slot to book it.</span>
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
          <div className="relative h-7">
            {HOURS.map((h) => (
              <span
                key={h}
                className="absolute -translate-x-1/2 text-[11px] font-medium tabular-nums text-white/35"
                style={{ left: `${percent(h * 60)}%` }}
              >
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
            {showNow && nowMin !== null && (
              <span
                className="absolute -translate-x-1/2 rounded-full bg-red-500 px-1.5 py-px text-[10px] font-semibold tabular-nums text-white shadow-lg shadow-red-500/40"
                style={{ left: `${percent(nowMin)}%`, top: 14 }}
              >
                {fromMinutes(nowMin)}
              </span>
            )}
          </div>
        </div>

        <div className="mt-1 space-y-1.5">
          {rooms.map((room, roomIndex) => {
            const roomBookings = bookings.filter((b) => b.room_id === room.id);
            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: roomIndex * 0.05, duration: 0.4 }}
                className="grid grid-cols-[150px_1fr]"
              >
                <div className="flex flex-col justify-center pr-3">
                  <span className="truncate text-sm font-medium text-white/90">{room.name}</span>
                  <span className="text-xs text-white/35">{room.capacity} seats</span>
                </div>
                <div
                  className="group relative h-14 cursor-pointer overflow-hidden rounded-xl bg-white/[0.025] ring-1 ring-inset ring-white/[0.05] transition-colors hover:bg-indigo-500/[0.07] hover:ring-indigo-400/20"
                  onClick={(e) => handleRowClick(e, room.id)}
                  title={`Book ${room.name}`}
                >
                  {HOURS.slice(1, -1).map((h) => (
                    <span
                      key={h}
                      className="pointer-events-none absolute inset-y-0 border-l border-white/[0.05]"
                      style={{ left: `${percent(h * 60)}%` }}
                    />
                  ))}

                  {roomBookings.map((b, i) => {
                    const left = percent(toMinutes(b.start_time));
                    const width = percent(toMinutes(b.end_time)) - left;
                    return (
                      <motion.button
                        key={b.id}
                        type="button"
                        initial={{ opacity: 0, scaleX: 0.6 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        whileHover={{ y: -2 }}
                        transition={{ delay: roomIndex * 0.05 + i * 0.04 + 0.15, type: "spring", stiffness: 300, damping: 26 }}
                        style={{
                          left: `calc(${left}% + 2px)`,
                          width: `calc(${width}% - 4px)`,
                          transformOrigin: "left center",
                        }}
                        onClick={(e) => {
                          e.stopPropagation(); // don't also trigger "book this slot"
                          onBooking(b);
                        }}
                        className={cn(
                          "absolute inset-y-1.5 overflow-hidden rounded-lg px-2.5 text-left text-xs shadow-lg ring-1 ring-inset transition-shadow",
                          roleStyles[b.my_role ?? "other"],
                        )}
                        title={`${b.title} · ${b.start_time}-${b.end_time} · ${b.organizer.name}`}
                      >
                        <span className="block truncate font-semibold">{b.title}</span>
                        <span className="block truncate tabular-nums opacity-75">
                          {b.start_time}-{b.end_time}
                        </span>
                      </motion.button>
                    );
                  })}

                  {showNow && nowMin !== null && (
                    <span
                      className="pointer-events-none absolute inset-y-0 w-0.5 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                      style={{ left: `${percent(nowMin)}%` }}
                      aria-hidden
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
