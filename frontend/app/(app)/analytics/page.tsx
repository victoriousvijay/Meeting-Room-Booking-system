"use client";

import { motion } from "framer-motion";
import { BarChart3, CalendarCheck, Clock, Lock, Trophy } from "lucide-react";
import { useState } from "react";
import { ErrorState, Skeleton } from "@/components/States";
import { Avatar, Card, EmptyState, PageHeader, StatCard, Tabs } from "@/components/ui";
import { useToday } from "@/hooks/useNow";
import { useQuery } from "@/hooks/useQuery";
import { api } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { formatDateShort } from "@/lib/time";
import type { Analytics } from "@/lib/types";

type Range = "7" | "30" | "90";

export default function AnalyticsPage() {
  const user = useUser();
  const today = useToday();
  const [range, setRange] = useState<Range>("30");
  const isAdmin = user.role === "admin";
  const stats = useQuery(
    isAdmin && today ? `analytics:${range}:${today}` : null,
    () => api.analytics({ days: Number(range), end: today ?? "" }),
  );

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Analytics" />
        <EmptyState icon={Lock} title="Admins only" description="Ask a workspace admin if you need usage numbers." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        description="How your rooms are being used."
        actions={
          <Tabs
            value={range}
            onChange={setRange}
            options={[
              { value: "7", label: "7 days" },
              { value: "30", label: "30 days" },
              { value: "90", label: "90 days" },
            ]}
          />
        }
      />
      {stats.error ? (
        <ErrorState message={stats.error} onRetry={stats.retry} />
      ) : !stats.data ? (
        <Skeleton rows={4} />
      ) : (
        <Report data={stats.data} />
      )}
    </>
  );
}

function Report({ data }: { data: Analytics }) {
  const busiestDay = Math.max(1, ...data.per_day.map((d) => d.bookings));
  const perDay = data.total_bookings / data.days;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={CalendarCheck} label="Bookings" value={data.total_bookings} hint={`${perDay.toFixed(1)} per day`} />
        <StatCard icon={Clock} label="Hours booked" value={data.booked_hours} hint="Across all rooms" />
        <StatCard icon={Trophy} label="Busiest room" value={data.busiest_room ?? "-"} hint="Most hours booked" />
        <StatCard
          icon={BarChart3}
          label="Average usage"
          value={`${data.per_room.length ? (data.per_room.reduce((s, r) => s + r.utilization_pct, 0) / data.per_room.length).toFixed(0) : 0}%`}
          hint="Of bookable hours, per room"
        />
      </div>

      <Card className="p-4 sm:p-5">
        <h2 className="font-semibold text-white">Bookings per day</h2>
        <div className="mt-4 flex h-40 items-end gap-px sm:gap-1" role="img" aria-label="Bookings per day chart">
          {data.per_day.map((d, i) => (
            <motion.div
              key={d.date}
              title={`${formatDateShort(d.date)}: ${d.bookings} booking${d.bookings === 1 ? "" : "s"}`}
              className="flex-1 rounded-t bg-gradient-to-t from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300"
              initial={{ height: 0 }}
              animate={{ height: `${Math.max((d.bookings / busiestDay) * 100, d.bookings ? 4 : 1)}%` }}
              transition={{ delay: Math.min(i * 0.01, 0.4), duration: 0.4 }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-white/40">
          <span>{formatDateShort(data.start)}</span>
          <span>{formatDateShort(data.end)}</span>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h2 className="font-semibold text-white">Room usage</h2>
          <p className="text-xs text-white/50">Share of 09:00-18:00 that each room was booked.</p>
          <ul className="mt-4 space-y-3">
            {data.per_room.map((r) => (
              <li key={r.room_id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-white/90">{r.room_name}</span>
                  <span className="tabular-nums text-white/50">
                    {r.utilization_pct}% · {(r.booked_minutes / 60).toFixed(1)} h
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(r.utilization_pct, 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="font-semibold text-white">Top organisers</h2>
          <p className="text-xs text-white/50">Who books the most meetings.</p>
          {data.top_organizers.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">No bookings in this period.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {data.top_organizers.map((o, i) => (
                <li key={o.user_id} className="flex items-center gap-3">
                  <span className="w-4 text-sm tabular-nums text-white/40">{i + 1}</span>
                  <Avatar name={o.name} size="sm" />
                  <span className="flex-1 text-sm text-white/90">{o.name}</span>
                  <span className="text-sm tabular-nums text-white/50">
                    {o.bookings} booking{o.bookings === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
