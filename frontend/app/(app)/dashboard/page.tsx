"use client";

import { CalendarCheck, CalendarClock, DoorOpen, Gauge, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useBookingActions } from "@/components/BookingActions";
import { ErrorState, Skeleton } from "@/components/States";
import Timeline, { TimelineLegend } from "@/components/Timeline";
import { AvatarStack, Badge, Button, ButtonLink, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { useNow } from "@/hooks/useNow";
import { useQuery } from "@/hooks/useQuery";
import { api } from "@/lib/api";
import { useUser } from "@/lib/auth";
import {
  DAY_END_MIN,
  DAY_START_MIN,
  WORKING_MINUTES,
  dayLabel,
  formatDateLong,
  greeting,
  minutesOfDay,
  toISODate,
  toMinutes,
} from "@/lib/time";
import type { Booking } from "@/lib/types";

export default function DashboardPage() {
  const user = useUser();
  const now = useNow();
  const today = now ? toISODate(now) : null;
  const { changes, newBooking, showBooking } = useBookingActions();

  const rooms = useQuery("rooms", () => api.rooms(), changes);
  const bookings = useQuery(today && `bookings:${today}`, () => api.bookings({ date: today ?? "" }), changes);
  const mine = useQuery(
    today && `mine:${today}`,
    () => api.myBookings({ scope: "upcoming", today: today ?? "", limit: 10 }),
    changes,
  );

  const error = rooms.error ?? bookings.error ?? mine.error;
  const loading = !now || rooms.isLoading || bookings.isLoading || mine.isLoading;
  const firstName = user.name.split(" ")[0];

  const header = (
    <PageHeader
      title={now ? `${greeting(now)}, ${firstName}` : `Hello, ${firstName}`}
      description={today ? formatDateLong(today) : " "}
      actions={
        <>
          <ButtonLink href="/find" variant="secondary" icon={Search}>
            Find a room
          </ButtonLink>
          <Button icon={Plus} onClick={() => newBooking()}>
            New booking
          </Button>
        </>
      }
    />
  );

  if (error) {
    return (
      <>
        {header}
        <ErrorState
          message={error}
          onRetry={() => {
            rooms.retry();
            bookings.retry();
            mine.retry();
          }}
        />
      </>
    );
  }
  if (loading || !now || !rooms.data || !bookings.data || !mine.data || !today) {
    return (
      <>
        {header}
        <Skeleton rows={5} />
      </>
    );
  }

  const roomList = rooms.data;
  const todays = bookings.data;
  const nowMin = minutesOfDay(now);
  const officeOpen = nowMin >= DAY_START_MIN && nowMin < DAY_END_MIN;
  const busyNow = (roomId: number) =>
    todays.some(
      (b) => b.room_id === roomId && toMinutes(b.start_time) <= nowMin && nowMin < toMinutes(b.end_time),
    );
  const freeNow = roomList.filter((r) => !busyNow(r.id)).length;
  const bookedMinutes = todays.reduce((sum, b) => sum + toMinutes(b.end_time) - toMinutes(b.start_time), 0);
  const utilization = roomList.length ? Math.round((100 * bookedMinutes) / (roomList.length * WORKING_MINUTES)) : 0;
  const myToday = todays.filter((b) => b.my_role).length;
  // "Upcoming" from the server includes earlier meetings today; drop the ones already over.
  const upNext = mine.data
    .filter((b) => b.date !== today || toMinutes(b.end_time) > nowMin)
    .slice(0, 4);

  return (
    <>
      {header}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={CalendarCheck} label="Meetings today" value={todays.length} hint="Across all rooms" />
        <StatCard
          icon={DoorOpen}
          label="Rooms free now"
          value={officeOpen ? `${freeNow} / ${roomList.length}` : "-"}
          hint={officeOpen ? "Available right this minute" : "Office hours are 09:00-18:00"}
        />
        <StatCard icon={CalendarClock} label="Your meetings today" value={myToday} hint="Organising or invited" />
        <StatCard icon={Gauge} label="Room usage today" value={`${utilization}%`} hint="Of bookable hours" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-zinc-900">Today&apos;s rooms</h2>
            <Link href="/schedule" className="text-sm font-medium text-indigo-600 hover:underline">
              Open schedule
            </Link>
          </div>
          {roomList.length === 0 ? (
            <EmptyState
              icon={DoorOpen}
              title="No rooms yet"
              description={user.role === "admin" ? "Add your first room to start taking bookings." : "Ask an admin to add rooms."}
              action={
                user.role === "admin" && (
                  <ButtonLink href="/rooms">Add rooms</ButtonLink>
                )
              }
            />
          ) : (
            <>
              <Timeline
                rooms={roomList}
                bookings={todays}
                now={now}
                onBooking={showBooking}
                onEmptySlot={(roomId, start, end) =>
                  newBooking({ roomId: String(roomId), date: today, startTime: start, endTime: end })
                }
              />
              <div className="mt-3">
                <TimelineLegend />
              </div>
            </>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Up next for you</h2>
            <Link href="/meetings" className="text-sm font-medium text-indigo-600 hover:underline">
              All
            </Link>
          </div>
          {upNext.length === 0 ? (
            <p className="rounded-lg bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-500">
              Nothing coming up. Enjoy the focus time.
            </p>
          ) : (
            <ul className="space-y-2">
              {upNext.map((b, i) => (
                <UpNextItem key={b.id} booking={b} today={today} highlight={i === 0} onClick={() => showBooking(b)} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function UpNextItem({
  booking: b,
  today,
  highlight,
  onClick,
}: {
  booking: Booking;
  today: string;
  highlight: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-lg border p-3 text-left transition hover:border-indigo-300 ${
          highlight ? "border-indigo-200 bg-indigo-50/60" : "border-zinc-200"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-zinc-500">
            {dayLabel(b.date, today)} · <span className="tabular-nums">{b.start_time}</span>
          </span>
          <Badge tone={b.my_role === "organizer" ? "indigo" : "green"}>
            {b.my_role === "organizer" ? "Organiser" : "Invited"}
          </Badge>
        </div>
        <p className="mt-1 truncate text-sm font-medium text-zinc-900">{b.title}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-zinc-500">{b.room_name}</span>
          <AvatarStack names={[b.organizer.name, ...b.attendees.map((a) => a.name)]} />
        </div>
      </button>
    </li>
  );
}
