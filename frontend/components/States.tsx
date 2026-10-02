"use client";

import { CloudOff, DoorClosed, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

export function RoomsSkeleton({ count }: { count: number }) {
  // Render's free tier sleeps when idle and the first request can take close to
  // a minute. Without a hint that looks like the app is broken.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div aria-busy="true" aria-label="Loading rooms">
      {slow && (
        <p className="mb-3 text-sm text-zinc-500">
          Waking up the server - the first load after a quiet spell can take up to a minute.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-zinc-200 bg-white p-4">
            <div className="h-4 w-28 rounded bg-zinc-200" />
            <div className="mt-2 h-3 w-44 rounded bg-zinc-100" />
            <div className="mt-5 h-2 rounded-full bg-zinc-100" />
            <div className="mt-5 h-10 rounded-lg bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
      <CloudOff className="size-8 text-zinc-400" aria-hidden />
      <p className="mt-3 font-medium text-zinc-900">Couldn&apos;t load bookings</p>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        <RotateCw className="size-4" aria-hidden /> Try again
      </button>
    </div>
  );
}

export function NoRooms() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center">
      <DoorClosed className="size-8 text-zinc-400" aria-hidden />
      <p className="mt-3 font-medium text-zinc-900">No rooms to show</p>
      <p className="mt-1 text-sm text-zinc-500">The server didn&apos;t return any rooms.</p>
    </div>
  );
}
