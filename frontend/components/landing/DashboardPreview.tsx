// A static, decorative picture of the dashboard for the landing page. Built from
// divs rather than a screenshot so it stays sharp and always matches the app.
import { CalendarCheck, CalendarDays, DoorOpen, LayoutDashboard, Search, Users } from "lucide-react";

type Block = [start: number, end: number, kind: "mine" | "invited" | "other"]; // minutes after 09:00

const ROOMS: { name: string; seats: number; blocks: Block[] }[] = [
  { name: "Ganga", seats: 4, blocks: [[30, 60, "other"], [240, 270, "mine"]] },
  { name: "Yamuna", seats: 6, blocks: [[300, 345, "invited"]] },
  { name: "Kaveri", seats: 8, blocks: [[120, 210, "invited"], [390, 450, "other"]] },
  { name: "Narmada", seats: 12, blocks: [[60, 120, "mine"], [270, 330, "other"]] },
  { name: "Godavari", seats: 20, blocks: [[360, 420, "mine"]] },
];

const BLOCK_STYLE = {
  mine: "bg-indigo-500",
  invited: "bg-emerald-500",
  other: "bg-white/15",
};

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: CalendarDays, label: "Schedule" },
  { icon: CalendarCheck, label: "My meetings" },
  { icon: Search, label: "Find a room" },
  { icon: DoorOpen, label: "Rooms" },
  { icon: Users, label: "People" },
];

const STATS = [
  ["Meetings today", "12"],
  ["Free right now", "3/5"],
  ["Yours today", "4"],
  ["Room usage", "38%"],
];

const pct = (minutes: number) => `${(minutes / 540) * 100}%`;

export default function DashboardPreview() {
  return (
    <div
      role="img"
      aria-label="Preview of the RoomSync dashboard: stats, your next meeting and a timeline of every room"
      className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 text-left shadow-2xl shadow-indigo-950/40"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3" aria-hidden>
        <span className="size-2.5 rounded-full bg-white/20" />
        <span className="size-2.5 rounded-full bg-white/20" />
        <span className="size-2.5 rounded-full bg-white/20" />
        <span className="ml-3 rounded-md bg-white/5 px-3 py-1 text-[11px] text-white/40">roomsync.app/dashboard</span>
      </div>

      <div className="flex" aria-hidden>
        <aside className="hidden w-44 shrink-0 border-r border-white/10 p-3 md:block">
          <div className="mb-4 flex items-center gap-2 px-2">
            <span className="size-5 rounded-md bg-indigo-500" />
            <span className="text-sm font-semibold">RoomSync</span>
          </div>
          {NAV.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={`mb-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                active ? "bg-white/10 text-white" : "text-white/50"
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </div>
          ))}
        </aside>

        <div className="min-w-0 flex-1 space-y-4 p-4 md:p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-base font-semibold md:text-lg">Good morning, Vijay</p>
              <p className="text-[11px] text-white/40">Friday, 2 October</p>
            </div>
            <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-black">New booking</span>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.3fr_1fr]">
            <div className="rounded-xl bg-indigo-600 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-indigo-100">Your next meeting</p>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px]">Starts in 25 min</span>
              </div>
              <p className="mt-2 text-sm font-semibold md:text-base">Design review</p>
              <p className="mt-1 text-[11px] text-indigo-100">13:00-13:30 · Ganga</p>
              <div className="mt-3 flex -space-x-1.5">
                {["bg-amber-200", "bg-sky-200", "bg-rose-200", "bg-emerald-200"].map((c) => (
                  <span key={c} className={`size-5 rounded-full ring-2 ring-indigo-600 ${c}`} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STATS.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                  <p className="text-[10px] text-white/40">{label}</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 md:p-4">
            <p className="mb-2 text-xs font-medium">Today&apos;s rooms</p>
            <div className="space-y-1.5">
              {ROOMS.map((room) => (
                <div key={room.name} className="grid grid-cols-[70px_1fr] items-center gap-2 md:grid-cols-[90px_1fr]">
                  <span className="truncate text-[11px] text-white/60">
                    {room.name} <span className="text-white/30">· {room.seats}</span>
                  </span>
                  <div className="relative h-6 rounded bg-white/[0.04]">
                    {room.blocks.map(([start, end, kind]) => (
                      <span
                        key={start}
                        className={`absolute inset-y-1 rounded-sm ${BLOCK_STYLE[kind]}`}
                        style={{ left: pct(start), width: pct(end - start) }}
                      />
                    ))}
                    <span className="absolute inset-y-0 w-px bg-red-400" style={{ left: pct(225) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
