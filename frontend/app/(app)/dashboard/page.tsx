"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
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
import {
  AvatarStack,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
  cn,
  rise,
  stagger,
} from "@/components/ui";
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
      eyebrow={today ? formatDateLong(today) : " "}
      title={now ? `${greeting(now)}, ${firstName}` : `Hello, ${firstName}`}
      description="Here's what's happening across your rooms today."
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

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-12">
          <motion.div variants={rise} className="lg:col-span-7">
            <NextMeetingCard booking={next ?? null} today={today} nowMin={nowMin} onOpen={showBooking} />
          </motion.div>
          <motion.div variants={stagger} className="grid grid-cols-2 gap-4 lg:col-span-5">
            <StatCard icon={CalendarCheck} label="Meetings today" value={todays.length} hint="Across all rooms" />
            <StatCard
              icon={DoorOpen}
              tone="emerald"
              label="Free right now"
              value={officeOpen ? `${freeNow}/${roomList.length}` : "-"}
              hint={officeOpen ? "Rooms available" : "Opens at 09:00"}
            />
            <StatCard icon={CalendarClock} tone="violet" label="Yours today" value={myToday} hint="Organising or invited" />
            <StatCard icon={Gauge} tone="amber" label="Room usage" value={`${utilization}%`} hint="Of today's hours" />
          </motion.div>
        </div>

        <motion.div variants={rise}>
          <Card className="min-w-0 p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-white">Today&apos;s rooms</h2>
                <p className="text-xs text-white/40">A live view of every room. Click an empty slot to book it.</p>
              </div>
              <Link
                href="/schedule"
                className="group inline-flex items-center gap-1 text-sm font-medium text-indigo-300 hover:text-indigo-200"
              >
                Full schedule
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>
            {roomList.length === 0 ? (
              <EmptyState
                icon={DoorOpen}
                title="No rooms yet"
                description={
                  user.role === "admin" ? "Add your first room to start taking bookings." : "Ask an admin to add rooms."
                }
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
                <div className="mt-4">
                  <TimelineLegend />
                </div>
              </>
            )}
          </Card>
        </motion.div>

        {roomList.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-12">
            <motion.div variants={rise} className="lg:col-span-7">
              <Card className="h-full p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-white">Rooms right now</h2>
                    <p className="text-xs text-white/40">
                      {officeOpen ? "Live status, updated every minute." : "Rooms can be booked from 09:00 to 18:00."}
                    </p>
                  </div>
                  {officeOpen && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-400/20">
                      <span className="relative flex size-1.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                      </span>
                      Live
                    </span>
                  )}
                </div>
                <ul className="mt-4 space-y-1">
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
            </motion.div>

            <motion.div variants={rise} className="lg:col-span-5">
              <Card className="h-full p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-white">Later for you</h2>
                  <Link href="/meetings" className="text-sm font-medium text-indigo-300 hover:text-indigo-200">
                    My meetings
                  </Link>
                </div>
                {later.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-white/10 px-3 py-10 text-center text-sm text-white/40">
                    Nothing else on your calendar.
                  </div>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {later.slice(0, 5).map((b, i) => (
                      <motion.li
                        key={b.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                      >
                        <button
                          type="button"
                          onClick={() => showBooking(b)}
                          className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:border-white/15 hover:bg-white/[0.05]"
                        >
                          <div className="grid w-[84px] shrink-0 place-items-center rounded-lg bg-white/[0.04] py-1.5 text-center">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                              {dayLabel(b.date, today)}
                            </p>
                            <p className="text-sm font-semibold tabular-nums text-white">{b.start_time}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{b.title}</p>
                            <p className="truncate text-xs text-white/40">{b.room_name}</p>
                          </div>
                          <AvatarStack names={[b.organizer.name, ...b.attendees.map((a) => a.name)]} max={3} />
                        </button>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </Card>
            </motion.div>
          </div>
        )}
      </motion.div>
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
      <Card className="flex h-full flex-col justify-center p-7">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">Your next meeting</p>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-white">Nothing on your calendar</p>
        <p className="mt-1 text-sm text-white/50">Book a room, or wait for a teammate to invite you.</p>
        <div className="mt-6">
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
    ? `Happening now · ends ${b.end_time}`
    : isToday
      ? `Starts in ${formatDuration(start - nowMin)}`
      : `${dayLabel(b.date, today)} at ${b.start_time}`;
  // While it runs, show how much of the meeting has passed.
  const progress = live ? ((nowMin - start) / (end - start)) * 100 : 0;

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(b)}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 p-7 text-left shadow-2xl shadow-indigo-950/50"
      style={{
        background:
          "radial-gradient(120% 140% at 0% 0%, rgba(99,102,241,0.55) 0%, rgba(124,58,237,0.28) 40%, rgba(12,12,18,0.95) 75%)",
      }}
    >
      {/* Slowly drifting light, so the card feels alive without demanding attention. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-indigo-400/25 blur-3xl"
        animate={{ x: [0, -24, 0], y: [0, 18, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-100/70">Your next meeting</p>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur",
            live ? "bg-white text-indigo-700" : "bg-white/10 text-white ring-1 ring-white/20",
          )}
        >
          {live && (
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-red-500" />
            </span>
          )}
          {when}
        </span>
      </div>

      <p className="relative mt-5 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">{b.title}</p>

      <div className="relative mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-indigo-100/80">
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Clock className="size-4" aria-hidden /> {b.start_time}-{b.end_time}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-4" aria-hidden /> {b.room_name}
        </span>
      </div>

      {live && (
        <div className="relative mt-5 h-1 overflow-hidden rounded-full bg-white/15">
          <motion.div
            className="h-full rounded-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      )}

      <div className="relative mt-auto flex items-center justify-between pt-7">
        <AvatarStack names={[b.organizer.name, ...b.attendees.map((a) => a.name)]} max={5} ring="ring-indigo-900" />
        <span className="inline-flex items-center gap-1 text-sm font-medium text-white/80 transition group-hover:text-white">
          {b.my_role === "organizer" ? "You're organising" : `By ${b.organizer.name.split(" ")[0]}`}
          <ArrowUpRight
            className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden
          />
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
    status = <span className="text-white/40">Closed until 09:00</span>;
  } else if (current) {
    status = (
      <span className="text-white/50">
        <span className="font-medium text-amber-300">In use</span> until {current.end_time} · {current.title}
      </span>
    );
  } else {
    status = (
      <span className="text-white/50">
        <span className="font-medium text-emerald-300">Free</span>{" "}
        {nextStart ? `until ${fromMinutes(nextStart)}` : "for the rest of the day"}
      </span>
    );
  }

  return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.03]">
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          !officeOpen
            ? "bg-white/20"
            : current
              ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]"
              : "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">
          {room.name} <span className="font-normal text-white/30">· {room.capacity} seats</span>
        </p>
        <p className="truncate text-xs">{status}</p>
      </div>
      {bookable && (
        <Button size="sm" variant="secondary" onClick={() => onBook(freeUntil)}>
          Book
        </Button>
      )}
    </li>
  );
}
