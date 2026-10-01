"use client";

// Loads bookings for the selected date/room and keeps the list in sync after changes.
import { useCallback, useEffect, useState } from "react";
import { describeError, listBookings } from "@/lib/api";
import type { Booking } from "@/lib/types";

type State = { key: string; bookings: Booking[]; error: string | null };

function byStartTime(a: Booking, b: Booking) {
  return a.start_time.localeCompare(b.start_time);
}

export function useBookings(date: string, roomId: number | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State | null>(null);
  const key = `${date}|${roomId ?? "all"}|${attempt}`;

  useEffect(() => {
    // Responses can arrive out of order when the user clicks through dates
    // quickly; `ignore` drops any answer for a date we've already left.
    let ignore = false;
    listBookings({ date, roomId }).then(
      (bookings) => !ignore && setState({ key, bookings, error: null }),
      (err) => !ignore && setState({ key, bookings: [], error: describeError(err).message }),
    );
    return () => {
      ignore = true;
    };
  }, [key, date, roomId]);

  const current = state?.key === key ? state : null;

  // After a create or cancel we patch the list with the server's response
  // instead of refetching, so the list doesn't flash a loading state.
  const add = useCallback(
    (booking: Booking) => {
      if (booking.date !== date || (roomId !== null && booking.room_id !== roomId)) return;
      setState((prev) => prev && { ...prev, bookings: [...prev.bookings, booking].sort(byStartTime) });
    },
    [date, roomId],
  );

  const remove = useCallback((id: number) => {
    setState((prev) => prev && { ...prev, bookings: prev.bookings.filter((b) => b.id !== id) });
  }, []);

  return {
    bookings: current?.bookings ?? [],
    error: current?.error ?? null,
    isLoading: current === null,
    retry: () => setAttempt((n) => n + 1),
    add,
    remove,
  };
}
