"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  BarChart3,
  CalendarCheck,
  CalendarClock,
  Check,
  ChevronDown,
  Search,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import DashboardPreview from "@/components/landing/DashboardPreview";
import RevealStatement from "@/components/landing/RevealStatement";
import Logo from "@/components/Logo";
import { useToast } from "@/components/Toast";
import { api, describeError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DEMO_ACCOUNTS } from "@/lib/demo";

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: CalendarCheck, title: "No double-booking", text: "Overlaps are rejected the moment they happen, and you're told exactly which meeting is in the way." },
  { icon: Search, title: "Find a room in one step", text: "Say how long and how many people. Get every room that fits, earliest free slot first." },
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

const ROLES = [
  {
    title: "For everyone",
    points: [
      "Live dashboard with your next meeting",
      "Book any free slot in two clicks",
      "Invite teammates, with a live seat count",
      "Upcoming and past meetings in one list",
    ],
  },
  {
    title: "For admins",
    points: [
      "Add, edit or close rooms",
      "Manage people and roles",
      "Usage analytics over 7, 30 or 90 days",
      "Invite links with a replaceable join code",
    ],
  },
];

const STATEMENT =
  "Teams lose hours every week chasing free rooms and untangling double bookings. RoomSync puts every room, every meeting and every teammate on one screen, so booking takes seconds and clashes simply can't happen.";

// Entrance animation shared by the hero pieces, staggered by `delay`.
function enter(delay: number, y = 20, duration = 0.6) {
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration, delay },
  };
}

export default function LandingPage() {
  const { state, signIn } = useAuth();
  const router = useRouter();
  const notify = useToast();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const loggedIn = state.status === "authenticated";

  // Parallax: as the hero scrolls away, the text drifts up and fades out and the
  // preview rises a little faster than the page.
  const heroRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 0.5], [0, -200]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const previewY = useTransform(scrollYProgress, [0, 1], [0, -250]);

  async function tryDemo() {
    setLoadingDemo(true);
    try {
      signIn(await api.login(DEMO_ACCOUNTS.admin));
      router.push("/dashboard");
    } catch (err) {
      notify({ kind: "error", ...describeError(err) });
      setLoadingDemo(false);
    }
  }

  return (
    <div className="landing min-h-screen">
      <section ref={heroRef} className="relative overflow-hidden">
        <nav className="relative z-20 flex items-center justify-between px-6 py-4 md:px-28">
          <div className="flex items-center gap-12 md:gap-20">
            <Logo light />
            <div className="hidden items-center gap-1 text-sm text-white/70 md:flex">
              <a href="#features" className="rounded-md px-3 py-2 hover:text-white">
                Features
              </a>
              <a href="#how" className="inline-flex items-center gap-1 rounded-md px-3 py-2 hover:text-white">
                How it works <ChevronDown className="size-3.5" aria-hidden />
              </a>
              <a href="#roles" className="rounded-md px-3 py-2 hover:text-white">
                For admins
              </a>
            </div>
          </div>
          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
          >
            {loggedIn ? "Open app" : "Sign in"}
          </Link>
        </nav>

        <motion.div
          style={reduceMotion ? undefined : { y: textY, opacity: textOpacity }}
          className="relative z-10 mt-16 flex flex-col items-center px-4 text-center md:mt-20"
        >
          <motion.div {...enter(0, 10, 0.5)} className="liquid-glass mb-6 flex items-center gap-2 rounded-lg px-3 py-2">
            <span className="rounded-md bg-white px-2 py-0.5 text-sm font-medium text-black">New</span>
            <span className="text-sm font-medium text-white/65">Room analytics for admins</span>
          </motion.div>

          <motion.h1
            {...enter(0.1)}
            className="mb-3 text-5xl font-medium leading-tight tracking-[-2px] md:text-7xl md:leading-[1.15]"
          >
            Every meeting room.
            <br />
            One clear <span className="font-serif font-normal italic">overview</span>.
          </motion.h1>

          <motion.p {...enter(0.2)} className="mb-8 text-lg leading-6 opacity-90" style={{ color: "var(--hero-subtitle)" }}>
            RoomSync finds you a free room in seconds,
            <br className="hidden sm:block" /> shows who&apos;s meeting where, and makes double-booking impossible.
          </motion.p>

          <motion.div {...enter(0.3)} className="flex flex-col items-center gap-3 sm:flex-row">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                href={loggedIn ? "/dashboard" : "/signup"}
                className="inline-block rounded-full bg-white px-8 py-3.5 text-base font-medium text-black"
              >
                {loggedIn ? "Go to your dashboard" : "Get started for free"}
              </Link>
            </motion.div>
            {!loggedIn && (
              <button
                type="button"
                onClick={tryDemo}
                disabled={loadingDemo}
                className="rounded-full px-6 py-3.5 text-base font-medium text-white/80 transition hover:text-white disabled:opacity-60"
              >
                {loadingDemo ? "Opening the demo..." : "Explore the live demo →"}
              </button>
            )}
          </motion.div>
        </motion.div>

        <motion.div {...enter(0.4, 40, 0.8)} className="relative mt-14 flex justify-center pb-24 md:mt-16 md:pb-40">
          {/* A soft glow behind the preview, in place of a background video. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-[70%] max-w-5xl rounded-full bg-indigo-600/30 blur-[120px]"
          />
          <motion.div style={reduceMotion ? undefined : { y: previewY }} className="relative w-[92%] max-w-5xl">
            <DashboardPreview />
          </motion.div>
        </motion.div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-40 bg-gradient-to-t from-black to-transparent"
        />
      </section>

      <section className="px-6 py-24 md:px-28 md:py-32">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-10">
          <span className="font-serif text-7xl leading-none text-white/30" aria-hidden>
            &ldquo;
          </span>
          <RevealStatement text={STATEMENT} />
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-full border-[3px] border-white bg-indigo-600">
              <CalendarCheck className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-base font-semibold leading-7">RoomSync</p>
              <p className="text-sm leading-5 text-white/60">Why we built it</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-8 px-6 py-20 md:px-28">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-medium tracking-tight md:text-5xl">
            Everything a busy office <span className="font-serif font-normal italic">needs</span>.
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20"
              >
                <Icon className="size-5 text-indigo-400" aria-hidden />
                <h3 className="mt-4 font-medium">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-white/60">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-8 px-6 py-20 md:px-28">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-medium tracking-tight md:text-5xl">
            Up and running in <span className="font-serif font-normal italic">minutes</span>.
          </h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="border-t border-white/15 pt-6">
                <span className="text-sm tabular-nums text-white/40">0{i + 1}</span>
                <h3 className="mt-2 text-lg font-medium">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-white/60">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="roles" className="scroll-mt-8 px-6 py-20 md:px-28">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          {ROLES.map(({ title, points }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
              <h3 className="text-xl font-medium">{title}</h3>
              <ul className="mt-6 space-y-3">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm text-white/75">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-24 pt-10 md:px-28">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-gradient-to-b from-indigo-600/25 to-transparent px-6 py-16 text-center">
          <h2 className="text-3xl font-medium tracking-tight md:text-5xl">
            Stop chasing <span className="font-serif font-normal italic">free rooms</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-white/70">Set up your workspace in two minutes. Free to start.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link href="/signup" className="inline-block rounded-full bg-white px-8 py-3.5 font-medium text-black">
                Get started for free
              </Link>
            </motion.div>
            <Link href="/join" className="px-6 py-3.5 font-medium text-white/80 hover:text-white">
              Have a join code?
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 md:px-28">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-white/50 sm:flex-row">
          <Logo light />
          <p>Rooms bookable 09:00 - 18:00 · Next.js, FastAPI and PostgreSQL</p>
        </div>
      </footer>
    </div>
  );
}
