"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarCheck,
  CalendarClock,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import { useToast } from "@/components/Toast";
import { Button, ButtonLink } from "@/components/ui";
import { api, describeError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DEMO_ACCOUNTS } from "@/lib/demo";

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: CalendarCheck, title: "No double-booking", text: "Overlaps are rejected the moment they happen, and you're told exactly which meeting is in the way." },
  { icon: Sparkles, title: "Find a room in one step", text: "Say how long and how many people; get every room that fits, earliest free slot first." },
  { icon: Users, title: "Organiser and attendees", text: "Invite teammates to a booking. Everyone sees their meetings in one place." },
  { icon: CalendarClock, title: "The whole day at a glance", text: "A live timeline of every room. Click an empty slot to book it." },
  { icon: BarChart3, title: "Know how space is used", text: "Bookings per day, room utilisation and top organisers for admins." },
  { icon: ShieldCheck, title: "Private workspaces", text: "Each company's rooms and people are completely separate, with admin and member roles." },
];

const STEPS = [
  ["Create your workspace", "Sign up and add your meeting rooms, with seats and equipment."],
  ["Invite your team", "Share the join code. Teammates sign up and land in your workspace."],
  ["Book without the back-and-forth", "Pick a free slot, invite people, done. Clashes can't happen."],
];

export default function LandingPage() {
  const { state, signIn } = useAuth();
  const router = useRouter();
  const notify = useToast();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const loggedIn = state.status === "authenticated";

  async function tryDemo() {
    setLoadingDemo(true);
    try {
      const session = await api.login(DEMO_ACCOUNTS.admin);
      signIn(session);
      router.push("/dashboard");
    } catch (err) {
      notify({ kind: "error", ...describeError(err) });
      setLoadingDemo(false);
    }
  }

  return (
    <div className="bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          {loggedIn ? (
            <ButtonLink href="/dashboard">Open app</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost">
                Log in
              </ButtonLink>
              <ButtonLink href="/signup">Get started</ButtonLink>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 text-center sm:px-6 sm:pt-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            <Sparkles className="size-3.5" aria-hidden /> Meeting room booking for growing teams
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Meeting rooms, minus the chaos.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-600 sm:text-lg">
            RoomSync shows who&apos;s meeting where, finds you a free room in seconds and makes double-booking impossible.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/signup" className="px-5 py-2.5">
              Create a free workspace
            </ButtonLink>
            <Button variant="secondary" onClick={tryDemo} loading={loadingDemo} className="px-5 py-2.5">
              Explore the live demo
            </Button>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Have a join code?{" "}
            <Link href="/join" className="font-medium text-indigo-600 hover:underline">
              Join your team
            </Link>
          </p>
        </motion.div>
      </section>

      <section className="border-y border-zinc-100 bg-zinc-50">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-zinc-200 bg-white p-5"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icon className="size-4.5" aria-hidden />
              </span>
              <h3 className="mt-3 font-semibold text-zinc-900">{title}</h3>
              <p className="mt-1 text-sm text-zinc-600">{text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-zinc-900">Up and running in minutes</h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="text-center">
              <span className="mx-auto grid size-9 place-items-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 font-semibold text-zinc-900">{title}</h3>
              <p className="mt-1 text-sm text-zinc-600">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-zinc-500 sm:flex-row sm:px-6">
          <Logo />
          <p>Rooms bookable 09:00 - 18:00 · Built with Next.js, FastAPI and PostgreSQL</p>
        </div>
      </footer>
    </div>
  );
}
