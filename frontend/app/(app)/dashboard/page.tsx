"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  Clock,
  DoorOpen,
  Gauge,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useBookingActions } from "@/components/BookingActions";
import { ErrorState, Skeleton } from "@/components/States";
import Timeline, { TimelineLegend } from "@/components/Timeline";
import { AvatarStack, Badge, Button, ButtonLink, Card, EmptyState, PageHeader, StatCard, cn } from "@/components/ui";
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
  formatDuration,
  fromMinutes,
  greeting,
  minutesOfDay,
  toISODate,
  toMinutes,
} from "@/lib/time";
import type { Booking, Room } from "@/lib/types";
import type { BookingForm } from "@/lib/validation";

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
  if (!now || !today || !rooms.data || !bookings.data || !mine.data) {
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

  const inUseNow = (roomId: number) =>
    todays.some((b) => b.room_id === roomId && toMinutes(b.start_time) <= nowMin && nowMin < toMinutes(b.end_time));
  const freeNow = roomList.filter((r) => !inUseNow(r.id)).length;
  const bookedMinutes = todays.reduce((sum, b) => sum + toMinutes(b.end_time) - toMinutes(b.start_time), 0);
  const utilization = roomList.length ? Math.round((100 * bookedMinutes) / (roomList.length * WORKING_MINUTES)) : 0;
  const myToday = todays.filter((b) => b.my_role).length;

  // "Upcoming" from the server includes earlier meetings today; drop the ones already over.
  const upcoming = mine.data.filter((b) => b.date !== today || toMinutes(b.end_time) > nowMin);
  const [next, ...later] = upcoming;

  // Quick-book starts at the next quarter hour, so "Book" never offers a time that's already gone.
  const nextQuarter = Math.max(DAY_START_MIN, Math.ceil(nowMin / 15) * 15);
  const quickBook = (roomId: number, freeUntil: number): Partial<BookingForm> => ({
    roomId: String(roomId),
    date: today,
    startTime: fromMinutes(nextQuarter),
    endTime: fromMinutes(Math.min(nextQuarter + 30, freeUntil)),
  });

  return (
    <>
      {header}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <NextMeetingCard booking={next ?? null} today={today} nowMin={nowMin} onOpen={showBooking} />
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatCard icon={CalendarCheck} label="Meetings today" value={todays.length} hint="Across all rooms" />
          <StatCard
            icon={DoorOpen}
            label="Free right now"
            value={officeOpen ? `${freeNow}/${roomList.length}` : "-"}
            hint={officeOpen ? "Rooms available" : "Opens at 09:00"}
          />
          <StatCard icon={CalendarClock} label="Yours today" value={myToday} hint="Organising or invited" />
          <StatCard icon={Gauge} label="Room usage" value={`${utilization}%`} hint="Of today's hours" />
        </div>
      </div>

      <Card className="mt-6 min-w-0 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-zinc-900">Today&apos;s rooms</h2>
          <Link href="/schedule" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
            Full schedule <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        {roomList.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="No rooms yet"
            description={user.role === "admin" ? "Add your first room to start taking bookings." : "Ask an admin to add rooms."}
            action={user.role === "admin" && <ButtonLink href="/rooms">Add rooms</ButtonLink>}
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

      {roomList.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-4 sm:p-5">
            <h2 className="font-semibold text-zinc-900">Rooms right now</h2>
            <p className="text-xs text-zinc-500">
              {officeOpen ? "Live status, updated every minute." : "Rooms can be booked from 09:00 to 18:00."}
            </p>
            <ul className="mt-3 divide-y divide-zinc-100">
              {roomList.map((room) => (
                <RoomStatus
                  key={room.id}
                  room={room}
                  bookings={todays.filter((b) => b.room_id === room.id)}
                  nowMin={nowMin}
                  officeOpen={officeOpen}
                  onBook={(freeUntil) => newBooking(quickBook(room.id, freeUntil))}
                />
              ))}
            </ul>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900">Later for you</h2>
              <Link href="/meetings" className="text-sm font-medium text-indigo-600 hover:underline">
                My meetings
              </Link>
            </div>
            {later.length === 0 ? (
              <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-8 text-center text-sm text-zinc-500">
                Nothing else on your calendar.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {later.slice(0, 5).map((b, i) => (
                  <motion.li
                    key={b.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <button
                      type="button"
                      onClick={() => showBooking(b)}
                      className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 p-3 text-left transition hover:border-indigo-300"
                    >
                      <div className="w-16 shrink-0 text-xs">
                        <p className="font-medium text-zinc-900">{dayLabel(b.date, today)}</p>
                        <p className="tabular-nums text-zinc-500">{b.start_time}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">{b.title}</p>
                        <p className="truncate text-xs text-zinc-500">{b.room_name}</p>
                      </div>
                      <AvatarStack names={[b.organizer.name, ...b.attendees.map((a) => a.name)]} max={3} />
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function NextMeetingCard({
  booking: b,
  today,
  nowMin,
  onOpen,
}: {
  booking: Booking | null;
  today: string;
  nowMin: number;
  onOpen: (b: Booking) => void;
}) {
  if (!b) {
    return (
      <Card className="flex flex-col justify-center p-6">
        <p className="text-sm font-medium text-zinc-500">Your next meeting</p>
        <p className="mt-2 text-lg font-semibold text-zinc-900">Nothing on your calendar</p>
        <p className="mt-1 text-sm text-zinc-500">Book a room, or wait for a teammate to invite you.</p>
        <div className="mt-4">
          <ButtonLink href="/find" icon={Search}>
            Find a room
          </ButtonLink>
        </div>
      </Card>
    );
  }

  const start = toMinutes(b.start_time);
  const end = toMinutes(b.end_time);
  const isToday = b.date === today;
  const live = isToday && start <= nowMin && nowMin < end;
  const when = live
    ? `Happening now · ends at ${b.end_time}`
    : isToday
      ? `Starts in ${formatDuration(start - nowMin)}`
      : `${dayLabel(b.date, today)} at ${b.start_time}`;

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(b)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-xl bg-indigo-600 p-6 text-left text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-indigo-100">Your next meeting</p>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
            live ? "bg-white text-indigo-700" : "bg-white/15 text-white",
          )}
        >
          {live && <span className="size-1.5 animate-pulse rounded-full bg-red-500" aria-hidden />}
          {when}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold leading-tight">{b.title}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-indigo-100">
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Clock className="size-4" aria-hidden /> {b.start_time}-{b.end_time}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-4" aria-hidden /> {b.room_name}
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <AvatarStack names={[b.organizer.name, ...b.attendees.map((a) => a.name)]} max={5} />
        <span className="inline-flex items-center gap-1 text-sm font-medium text-white/90 group-hover:text-white">
          {b.my_role === "organizer" ? "You're organising" : `By ${b.organizer.name.split(" ")[0]}`}
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </div>
    </motion.button>
  );
}

function RoomStatus({
  room,
  bookings,
  nowMin,
  officeOpen,
  onBook,
}: {
  room: Room;
  bookings: Booking[];
  nowMin: number;
  officeOpen: boolean;
  onBook: (freeUntil: number) => void;
}) {
  const current = bookings.find((b) => toMinutes(b.start_time) <= nowMin && nowMin < toMinutes(b.end_time));
  const nextStart = bookings
    .map((b) => toMinutes(b.start_time))
    .filter((s) => s > nowMin)
    .sort((a, b) => a - b)[0];
  const freeUntil = nextStart ?? DAY_END_MIN;
  // Not worth offering a booking if less than 15 minutes are left before the next one.
  const bookable = officeOpen && !current && freeUntil - Math.ceil(nowMin / 15) * 15 >= 15;

  let status: React.ReactNode;
  if (!officeOpen) {
    status = <span className="text-zinc-500">Closed until 09:00</span>;
  } else if (current) {
    status = (
      <span className="text-zinc-600">
        <span className="font-medium text-amber-700">In use</span> until {current.end_time} · {current.title}
      </span>
    );
  } else {
    status = (
      <span className="text-zinc-600">
        <span className="font-medium text-emerald-700">Free</span>{" "}
        {nextStart ? `until ${fromMinutes(nextStart)}` : "for the rest of the day"}
      </span>
    );
  }

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        className={cn(
          "size-2.5 shrink-0 rounded-full",
          !officeOpen ? "bg-zinc-300" : current ? "bg-amber-500" : "bg-emerald-500",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900">
          {room.name} <span className="font-normal text-zinc-400">· {room.capacity} seats</span>
        </p>
        <p className="truncate text-xs">{status}</p>
      </div>
      {bookable ? (
        <Button size="sm" variant="secondary" onClick={() => onBook(freeUntil)}>
          Book
        </Button>
      ) : (
        current && <Badge tone="amber">Busy</Badge>
      )}
    </li>
  );
}
