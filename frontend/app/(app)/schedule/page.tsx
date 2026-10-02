"use client";

import { motion } from "framer-motion";
import { CalendarX, DoorOpen, Plus } from "lucide-react";
import { useState } from "react";
import { useBookingActions } from "@/components/BookingActions";
import DateNav from "@/components/DateNav";
import { ErrorState, Skeleton } from "@/components/States";
import Timeline, { TimelineLegend } from "@/components/Timeline";
import { AvatarStack, Badge, Button, Card, EmptyState, PageHeader, inputClass } from "@/components/ui";
import { useNow } from "@/hooks/useNow";
import { useQuery } from "@/hooks/useQuery";
import { api } from "@/lib/api";
import { formatDateLong, formatDuration, toISODate, toMinutes } from "@/lib/time";

export default function SchedulePage() {
  const now = useNow();
  const today = now ? toISODate(now) : null;
  // null = follow "today"; set once the user picks a different day.
  const [picked, setPicked] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const date = picked ?? today;
  const { changes, newBooking, showBooking } = useBookingActions();

  const rooms = useQuery("rooms", () => api.rooms(), changes);
  const bookings = useQuery(
    date && `bookings:${date}:${roomId ?? "all"}`,
    () => api.bookings({ date: date ?? "", roomId }),
    changes,
  );

  const visibleRooms = (rooms.data ?? []).filter((r) => roomId === null || r.id === roomId);
  const error = rooms.error ?? bookings.error;

  return (
    <>
      <PageHeader
        title="Schedule"
        description={date ? formatDateLong(date) : " "}
        actions={
          <Button icon={Plus} onClick={() => newBooking({ date: date ?? "", roomId: roomId ? String(roomId) : "" })}>
            New booking
          </Button>
        }
      />

      <Card className="mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        {date && today && <DateNav date={date} today={today} onChange={setPicked} />}
        <label className="flex items-center gap-2">
          <DoorOpen className="size-4 text-zinc-400" aria-hidden />
          <span className="sr-only">Filter by room</span>
          <select
            value={roomId ?? ""}
            onChange={(e) => setRoomId(e.target.value ? Number(e.target.value) : null)}
            className={`${inputClass} w-full border-zinc-300 sm:w-48`}
          >
            <option value="">All rooms</option>
            {(rooms.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </Card>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            rooms.retry();
            bookings.retry();
          }}
        />
      ) : !date || !rooms.data || !bookings.data ? (
        <Skeleton rows={4} />
      ) : rooms.data.length === 0 ? (
        <EmptyState icon={DoorOpen} title="No rooms yet" description="Once rooms are added, their bookings show up here." />
      ) : (
        <>
          <Card className="p-4 sm:p-5">
            <Timeline
              rooms={visibleRooms}
              bookings={bookings.data}
              now={date === today ? now : null}
              onBooking={showBooking}
              onEmptySlot={(id, start, end) => newBooking({ roomId: String(id), date, startTime: start, endTime: end })}
            />
            <div className="mt-3">
              <TimelineLegend />
            </div>
          </Card>

          <h2 className="mb-3 mt-8 font-semibold text-zinc-900">
            Agenda <span className="font-normal text-zinc-500">· {bookings.data.length} bookings</span>
          </h2>
          {bookings.data.length === 0 ? (
            <EmptyState icon={CalendarX} title="Nothing booked" description="Every room is free all day." />
          ) : (
            <ul className="space-y-2">
              {bookings.data.map((b, i) => (
                <motion.li
                  key={b.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <button
                    type="button"
                    onClick={() => showBooking(b)}
                    className="flex w-full items-center gap-4 rounded-xl border border-zinc-200 bg-white p-3 text-left transition hover:border-indigo-300"
                  >
                    <div className="w-24 shrink-0 text-sm tabular-nums">
                      <p className="font-medium text-zinc-900">{b.start_time}</p>
                      <p className="text-xs text-zinc-500">
                        {formatDuration(toMinutes(b.end_time) - toMinutes(b.start_time))}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{b.title}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {b.room_name} · by {b.organizer.name}
                      </p>
                    </div>
                    {b.my_role && (
                      <span className="hidden sm:block">
                        <Badge tone={b.my_role === "organizer" ? "indigo" : "green"}>
                          {b.my_role === "organizer" ? "Organiser" : "Invited"}
                        </Badge>
                      </span>
                    )}
                    <AvatarStack names={[b.organizer.name, ...b.attendees.map((a) => a.name)]} max={3} />
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
