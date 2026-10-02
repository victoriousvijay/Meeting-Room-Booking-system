"use client";

import { AnimatePresence } from "framer-motion";
import { CalendarDays, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { useBookings } from "@/hooks/useBookings";
import { useRooms } from "@/hooks/useRooms";
import { ApiError, cancelBooking, createBooking, describeError } from "@/lib/api";
import { WORK_END, WORK_START, formatDateLong, todayISO } from "@/lib/time";
import type { Booking, BookingInput } from "@/lib/types";
import type { BookingForm } from "@/lib/validation";
import BookingModal from "./BookingModal";
import Filters from "./Filters";
import NextSlotFinder from "./NextSlotFinder";
import RoomCard from "./RoomCard";
import { ErrorState, NoRooms, RoomsSkeleton } from "./States";
import { useToast } from "./Toast";

export default function BookingDashboard() {
  const notify = useToast();
  const [date, setDate] = useState(todayISO);
  const [roomFilter, setRoomFilter] = useState<number | null>(null);
  // null means the modal is closed; otherwise it holds the pre-filled fields.
  const [draft, setDraft] = useState<Partial<BookingForm> | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const rooms = useRooms();
  const bookings = useBookings(date, roomFilter);

  const visibleRooms =
    roomFilter === null ? rooms.rooms : rooms.rooms.filter((r) => r.id === roomFilter);

  const openModal = (fields: Partial<BookingForm> = {}) =>
    setDraft({ date, roomId: roomFilter ? String(roomFilter) : "", ...fields });

  const closeModal = useCallback(() => setDraft(null), []);

  async function handleCreate(input: BookingInput): Promise<boolean> {
    try {
      const { message, booking } = await createBooking(input);
      // Booked for another day: jump there so the new booking is visible.
      // That triggers a fresh fetch, which will include it.
      if (booking.date !== date) setDate(booking.date);
      else bookings.add(booking);
      setDataVersion((v) => v + 1);
      setDraft(null);
      notify({ kind: "success", title: "Booking created", message });
      return true;
    } catch (err) {
      notify({ kind: "error", ...describeError(err) });
      return false;
    }
  }

  async function handleCancel(booking: Booking) {
    setCancellingId(booking.id);
    try {
      const { message } = await cancelBooking(booking.id);
      bookings.remove(booking.id);
      setDataVersion((v) => v + 1);
      notify({ kind: "success", title: "Booking cancelled", message });
    } catch (err) {
      // A 404 means someone else already cancelled it, so drop it from the list too.
      if (err instanceof ApiError && err.status === 404) bookings.remove(booking.id);
      notify({ kind: "error", ...describeError(err) });
    } finally {
      setCancellingId(null);
    }
  }

  const error = rooms.error ?? bookings.error;
  const isLoading = rooms.isLoading || bookings.isLoading;

  let content: React.ReactNode;
  if (error) {
    content = (
      <ErrorState
        message={error}
        onRetry={() => {
          if (rooms.error) rooms.retry();
          bookings.retry();
        }}
      />
    );
  } else if (isLoading) {
    content = <RoomsSkeleton count={roomFilter === null ? 4 : 1} />;
  } else if (visibleRooms.length === 0) {
    content = <NoRooms />;
  } else {
    content = (
      <div className="grid gap-4 sm:grid-cols-2">
        {visibleRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            bookings={bookings.bookings.filter((b) => b.room_id === room.id)}
            cancellingId={cancellingId}
            onCancel={handleCancel}
            onBook={(roomId) => openModal({ roomId: String(roomId) })}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-indigo-600 text-white">
              <CalendarDays className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="font-semibold text-zinc-900">Meeting Rooms</h1>
              <p className="text-xs text-zinc-500">
                Open {WORK_START}-{WORK_END}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openModal()}
            disabled={rooms.rooms.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden />
            <span>
              New <span className="hidden sm:inline">booking</span>
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Filters
          date={date}
          onDateChange={setDate}
          rooms={rooms.rooms}
          roomId={roomFilter}
          onRoomChange={setRoomFilter}
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section aria-labelledby="day-heading" className="lg:order-1">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              {/* The server renders "today" in its own timezone, which can differ
                  from the visitor's, so a mismatch here is expected and harmless. */}
              <h2 id="day-heading" className="font-medium text-zinc-900" suppressHydrationWarning>
                {formatDateLong(date)}
              </h2>
              {!isLoading && !error && (
                <span className="text-sm text-zinc-500">
                  {bookings.bookings.length} booking{bookings.bookings.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {content}
          </section>

          <aside className="lg:order-2">
            {rooms.rooms.length > 0 && (
              <NextSlotFinder
                rooms={rooms.rooms}
                date={date}
                preferredRoomId={roomFilter}
                dataVersion={dataVersion}
                onBook={openModal}
              />
            )}
          </aside>
        </div>
      </main>

      <AnimatePresence>
        {draft && (
          <BookingModal
            rooms={rooms.rooms}
            initial={draft}
            onClose={closeModal}
            onSubmit={handleCreate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
