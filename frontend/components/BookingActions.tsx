"use client";

// Lets any page open "new booking" or a booking's details. Creating and
// cancelling live here, so the toasts and refreshes are the same everywhere.
import { AnimatePresence } from "framer-motion";
import { createContext, useCallback, useContext, useState } from "react";
import { useNow } from "@/hooks/useNow";
import { useQuery } from "@/hooks/useQuery";
import { ApiError, api, describeError } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { toISODate } from "@/lib/time";
import type { Booking, BookingInput } from "@/lib/types";
import type { BookingForm } from "@/lib/validation";
import BookingDetails from "./BookingDetails";
import BookingModal from "./BookingModal";
import { useToast } from "./Toast";

type BookingActions = {
  /** Bumped after every create or cancel; pages pass it to useQuery to refresh. */
  changes: number;
  newBooking: (draft?: Partial<BookingForm>) => void;
  showBooking: (booking: Booking) => void;
};

const BookingActionsContext = createContext<BookingActions | null>(null);

export function BookingActionsProvider({ children }: { children: React.ReactNode }) {
  const me = useUser();
  const notify = useToast();
  const now = useNow();
  const [draft, setDraft] = useState<Partial<BookingForm> | null>(null);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [changes, setChanges] = useState(0);
  const [opened, setOpened] = useState(0);

  // Rooms and people are fetched when the form opens (and refreshed each time),
  // so a room an admin just added shows up without reloading the page.
  const rooms = useQuery(draft ? "form:rooms" : null, () => api.rooms(), opened);
  const people = useQuery(draft ? "form:people" : null, () => api.people(), opened);

  const today = now ? toISODate(now) : "";
  const newBooking = useCallback(
    (fields: Partial<BookingForm> = {}) => {
      setOpened((n) => n + 1);
      setDraft({ date: today, ...fields });
    },
    [today],
  );
  const closeForm = useCallback(() => setDraft(null), []);
  const closeDetails = useCallback(() => setSelected(null), []);

  async function create(input: BookingInput): Promise<boolean> {
    try {
      const { message } = await api.createBooking(input);
      setDraft(null);
      setChanges((n) => n + 1);
      notify({ kind: "success", title: "Booking created", message });
      return true;
    } catch (err) {
      notify({ kind: "error", ...describeError(err) });
      return false;
    }
  }

  async function cancel(booking: Booking) {
    try {
      const { message } = await api.cancelBooking(booking.id);
      setSelected(null);
      setChanges((n) => n + 1);
      notify({ kind: "success", title: "Booking cancelled", message });
    } catch (err) {
      // A 404 means someone already cancelled it; refresh so it disappears.
      if (err instanceof ApiError && err.status === 404) {
        setSelected(null);
        setChanges((n) => n + 1);
      }
      notify({ kind: "error", ...describeError(err) });
    }
  }

  return (
    <BookingActionsContext.Provider value={{ changes, newBooking, showBooking: setSelected }}>
      {children}

      <AnimatePresence>
        {draft && (
          <BookingModal
            me={me}
            rooms={rooms.data}
            people={people.data}
            loadError={rooms.error ?? people.error}
            initial={draft}
            onClose={closeForm}
            onSubmit={create}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && <BookingDetails booking={selected} onClose={closeDetails} onCancel={cancel} />}
      </AnimatePresence>
    </BookingActionsContext.Provider>
  );
}

export function useBookingActions() {
  const ctx = useContext(BookingActionsContext);
  if (!ctx) throw new Error("useBookingActions must be used inside <BookingActionsProvider>");
  return ctx;
}
