"use client";

import { motion } from "framer-motion";
import { Clock, MapPin, SearchX, Users } from "lucide-react";
import { useState } from "react";
import { useBookingActions } from "@/components/BookingActions";
import DateNav from "@/components/DateNav";
import { ErrorState, Skeleton } from "@/components/States";
import { Badge, Button, Card, EmptyState, Field, PageHeader, cn, fieldBorder, inputClass } from "@/components/ui";
import { useNow } from "@/hooks/useNow";
import { useQuery } from "@/hooks/useQuery";
import { api } from "@/lib/api";
import {
  DAY_END_MIN,
  WORKING_MINUTES,
  dayLabel,
  formatDuration,
  fromMinutes,
  minutesOfDay,
  toISODate,
} from "@/lib/time";

const QUICK_DURATIONS = [15, 30, 45, 60, 90, 120];

function wholeNumber(text: string, min: number, max: number): number | null {
  const n = Number(text);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export default function FindRoomPage() {
  const now = useNow();
  const today = now ? toISODate(now) : null;
  const [picked, setPicked] = useState<string | null>(null);
  const [durationText, setDurationText] = useState("60");
  const [peopleText, setPeopleText] = useState("4");
  const [amenities, setAmenities] = useState<string[]>([]);
  const { changes, newBooking } = useBookingActions();
  const date = picked ?? today;

  const duration = wholeNumber(durationText, 5, WORKING_MINUTES);
  const people = wholeNumber(peopleText, 1, 500);

  // For today, only suggest slots that haven't started yet. Rounded up to the
  // next quarter hour so the search (and its key) only changes 4 times an hour.
  const nowMin = now ? minutesOfDay(now) : 0;
  const after = date === today ? fromMinutes(Math.ceil(nowMin / 15) * 15) : null;
  const closedForToday = date === today && nowMin >= DAY_END_MIN;

  // Searches as you type; an invalid input simply pauses the search.
  const results = useQuery(
    date && duration && people && !closedForToday ? `available:${date}:${duration}:${people}:${after}` : null,
    () => api.availableRooms({ date: date ?? "", duration: duration ?? 0, capacity: people ?? 1, after }),
    changes,
  );
  const rooms = useQuery("rooms", () => api.rooms());

  const allAmenities = [...new Set((rooms.data ?? []).flatMap((r) => r.amenities))].sort();
  const matches = (results.data ?? []).filter((r) =>
    amenities.every((a) => r.room.amenities.some((x) => x.toLowerCase() === a.toLowerCase())),
  );

  const toggleAmenity = (a: string) =>
    setAmenities((list) => (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]));

  return (
    <>
      <PageHeader title="Find a room" description="Tell us what you need; we'll show the earliest free rooms that fit." />

      <Card className="mb-6 space-y-4 p-4">
        {date && today && <DateNav date={date} today={today} onChange={setPicked} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="How long? (minutes)"
            error={duration === null ? `Whole minutes between 5 and ${WORKING_MINUTES}.` : undefined}
          >
            <input
              type="number"
              inputMode="numeric"
              min={5}
              max={WORKING_MINUTES}
              step={5}
              value={durationText}
              onChange={(e) => setDurationText(e.target.value)}
              className={cn(inputClass, fieldBorder(duration === null ? "x" : undefined))}
            />
          </Field>
          <Field label="How many people? (you included)" error={people === null ? "Between 1 and 500." : undefined}>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              value={peopleText}
              onChange={(e) => setPeopleText(e.target.value)}
              className={cn(inputClass, fieldBorder(people === null ? "x" : undefined))}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {QUICK_DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDurationText(String(d))}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                duration === d ? "border-indigo-600 bg-indigo-600 text-white" : "border-white/10 text-white/60 hover:bg-white/[0.05]",
              )}
            >
              {formatDuration(d)}
            </button>
          ))}
        </div>

        {allAmenities.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-white/80">Must have</p>
            <div className="flex flex-wrap gap-1.5">
              {allAmenities.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    amenities.includes(a)
                      ? "border-emerald-600 bg-emerald-500/15 text-emerald-200"
                      : "border-white/10 text-white/60 hover:bg-white/[0.05]",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {closedForToday ? (
        <EmptyState icon={SearchX} title="Rooms are closed for today" description="Bookings run 09:00-18:00. Pick another day above." />
      ) : results.error ? (
        <ErrorState message={results.error} onRetry={results.retry} />
      ) : duration === null || people === null ? null : !results.data || !date || !today ? (
        <Skeleton rows={3} />
      ) : matches.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No room fits"
          description="Every big-enough room is booked for that long. Try a shorter meeting, fewer people or another day."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-white/50">
            {matches.length} room{matches.length === 1 ? "" : "s"} free for {formatDuration(duration)} ·{" "}
            {dayLabel(date, today)} · earliest first
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {matches.map(({ room, start_time, end_time }, i) => (
              <motion.li
                key={room.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
              >
                <Card className="flex h-full flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-white">{room.name}</h3>
                    {i === 0 && <Badge tone="green">Best match</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/50">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" aria-hidden /> {room.capacity} seats
                    </span>
                    {room.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" aria-hidden /> {room.location}
                      </span>
                    )}
                  </div>
                  {room.amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {room.amenities.map((a) => (
                        <Badge key={a}>{a}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-emerald-300">
                      <Clock className="size-4" aria-hidden />
                      {start_time}-{end_time}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => newBooking({ roomId: String(room.id), date, startTime: start_time, endTime: end_time })}
                    >
                      Book
                    </Button>
                  </div>
                </Card>
              </motion.li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
