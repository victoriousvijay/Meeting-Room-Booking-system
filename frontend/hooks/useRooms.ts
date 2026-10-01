"use client";

// Loads the room list once, with loading/error state and a retry.
import { useEffect, useState } from "react";
import { describeError, listRooms } from "@/lib/api";
import type { Room } from "@/lib/types";

type State = { attempt: number; rooms: Room[]; error: string | null };

export function useRooms() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    let ignore = false;
    listRooms().then(
      (rooms) => !ignore && setState({ attempt, rooms, error: null }),
      (err) => !ignore && setState({ attempt, rooms: [], error: describeError(err).message }),
    );
    return () => {
      ignore = true;
    };
  }, [attempt]);

  // Loading is derived rather than stored: we're loading whenever the latest
  // result belongs to an older attempt (or there is none yet).
  const current = state?.attempt === attempt ? state : null;

  return {
    rooms: current?.rooms ?? [],
    error: current?.error ?? null,
    isLoading: current === null,
    retry: () => setAttempt((n) => n + 1),
  };
}
