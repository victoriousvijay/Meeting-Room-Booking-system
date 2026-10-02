"use client";

import { ChevronLeft, ChevronRight, DoorOpen } from "lucide-react";
import { shiftDate, todayISO } from "@/lib/time";
import type { Room } from "@/lib/types";

type Props = {
  date: string;
  onDateChange: (date: string) => void;
  rooms: Room[];
  roomId: number | null;
  onRoomChange: (roomId: number | null) => void;
};

const control =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

const iconButton =
  "grid size-9 shrink-0 place-items-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50";

export default function Filters({ date, onDateChange, rooms, roomId, onRoomChange }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={iconButton}
          onClick={() => onDateChange(shiftDate(date, -1))}
          aria-label="Previous day"
        >
          <ChevronLeft className="size-4" />
        </button>
        <input
          type="date"
          aria-label="Date"
          value={date}
          // Clearing a native date input yields "", which isn't a date to show.
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
          className={`${control} min-w-0 flex-1 sm:flex-none`}
          suppressHydrationWarning
        />
        <button
          type="button"
          className={iconButton}
          onClick={() => onDateChange(shiftDate(date, 1))}
          aria-label="Next day"
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onDateChange(todayISO())}
          className="rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
        >
          Today
        </button>
      </div>

      <label className="flex items-center gap-2">
        <DoorOpen className="size-4 text-zinc-400" aria-hidden />
        <span className="sr-only">Filter by room</span>
        <select
          value={roomId ?? ""}
          onChange={(e) => onRoomChange(e.target.value ? Number(e.target.value) : null)}
          className={`${control} w-full sm:w-48`}
        >
          <option value="">All rooms</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
