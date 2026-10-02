"use client";

import { motion } from "framer-motion";
import { CalendarCheck, Clock, DoorOpen } from "lucide-react";
import { useState } from "react";
import { useBookingActions } from "@/components/BookingActions";
import { ErrorState, Skeleton } from "@/components/States";
import { AvatarStack, Badge, ButtonLink, EmptyState, PageHeader, Tabs } from "@/components/ui";
import { useToday } from "@/hooks/useNow";
import { useQuery } from "@/hooks/useQuery";
import { api } from "@/lib/api";
import { dayLabel, formatDateLong } from "@/lib/time";
import type { Booking } from "@/lib/types";

type Scope = "upcoming" | "past";

function groupByDate(bookings: Booking[]) {
  const groups = new Map<string, Booking[]>();
  for (const b of bookings) groups.set(b.date, [...(groups.get(b.date) ?? []), b]);
  return [...groups.entries()];
}

export default function MeetingsPage() {
  const today = useToday();
  const [scope, setScope] = useState<Scope>("upcoming");
  const { changes, showBooking } = useBookingActions();
  const meetings = useQuery(
    today && `mine:${scope}:${today}`,
    () => api.myBookings({ scope, today: today ?? "", limit: 100 }),
    changes,
  );

  return (
    <>
      <PageHeader
        title="My meetings"
        description="Meetings you organise or have been invited to."
        actions={
          <Tabs
            value={scope}
            onChange={setScope}
            options={[
              { value: "upcoming", label: "Upcoming" },
              { value: "past", label: "Past" },
            ]}
          />
        }
      />

      {meetings.error ? (
        <ErrorState message={meetings.error} onRetry={meetings.retry} />
      ) : !meetings.data || !today ? (
        <Skeleton rows={4} />
      ) : meetings.data.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={scope === "upcoming" ? "No upcoming meetings" : "No past meetings yet"}
          description={scope === "upcoming" ? "Book a room or wait for an invite - it'll show up here." : undefined}
          action={scope === "upcoming" && <ButtonLink href="/find">Find a room</ButtonLink>}
        />
      ) : (
        <div className="space-y-6">
          {groupByDate(meetings.data).map(([date, list]) => (
            <section key={date}>
              <h2 className="mb-2 text-sm font-semibold text-zinc-900">
                {dayLabel(date, today)}{" "}
                <span className="font-normal text-zinc-500">· {formatDateLong(date)}</span>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {list.map((b, i) => (
                  <motion.li
                    key={b.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  >
                    <button
                      type="button"
                      onClick={() => showBooking(b)}
                      className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-zinc-900">{b.title}</p>
                        <Badge tone={b.my_role === "organizer" ? "indigo" : "green"}>
                          {b.my_role === "organizer" ? "Organiser" : "Invited"}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Clock className="size-3.5" aria-hidden /> {b.start_time}-{b.end_time}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <DoorOpen className="size-3.5" aria-hidden /> {b.room_name}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-zinc-500">
                          {b.my_role === "organizer" ? "You" : b.organizer.name}
                          {b.attendees.length > 0 &&
                            ` + ${b.attendees.length} ${b.attendees.length === 1 ? "other" : "others"}`}
                        </span>
                        <AvatarStack names={[b.organizer.name, ...b.attendees.map((a) => a.name)]} />
                      </div>
                    </button>
                  </motion.li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
