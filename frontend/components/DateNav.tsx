"use client";

// Previous / next day, a date picker and a jump back to today.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { shiftDate } from "@/lib/time";
import { Button, inputClass } from "./ui";

const iconButton =
  "grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/[0.08] hover:text-white active:scale-95";

export default function DateNav({
  date,
  today,
  onChange,
}: {
  date: string;
  today: string;
  onChange: (date: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={iconButton} onClick={() => onChange(shiftDate(date, -1))} aria-label="Previous day">
        <ChevronLeft className="size-4" />
      </button>
      <input
        type="date"
        aria-label="Date"
        value={date}
        // Clearing a native date input yields "", which isn't a date to show.
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className={`${inputClass} max-w-44 border-white/10`}
      />
      <button type="button" className={iconButton} onClick={() => onChange(shiftDate(date, 1))} aria-label="Next day">
        <ChevronRight className="size-4" />
      </button>
      <Button variant="ghost" onClick={() => onChange(today)} disabled={date === today} className="text-indigo-300">
        Today
      </Button>
    </div>
  );
}
