"use client";

// The current time, updated every minute, and null while rendering on the server.
import { useSyncExternalStore } from "react";
import { toISODate } from "@/lib/time";

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 15_000);
  return () => clearInterval(timer);
}

// Rounded to the minute so React sees the same value (and skips re-rendering)
// until the minute actually changes.
const clientMinute = () => Math.floor(Date.now() / 60_000);
// The server's clock and timezone aren't the visitor's, so render "unknown"
// there; the real time fills in right after the page loads in the browser.
const serverMinute = () => null;

export function useNow(): Date | null {
  const minute = useSyncExternalStore(subscribe, clientMinute, serverMinute);
  return minute === null ? null : new Date(minute * 60_000);
}

export function useToday(): string | null {
  const now = useNow();
  return now ? toISODate(now) : null;
}
