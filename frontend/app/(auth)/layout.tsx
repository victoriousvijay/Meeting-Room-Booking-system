"use client";

// Shared frame for login, sign-up and join. Logged-in visitors skip straight to the app.
import { motion } from "framer-motion";
import { ArrowLeft, CalendarCheck, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth";

// Same footage as the landing page, so signing in feels like one continuous product.
const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260717_120352_eb988725-1351-43b3-8095-16e4a1005e3d.mp4";
const LANDING_URL = "https://roomsync-landing.vercel.app";

const POINTS = [
  { icon: CalendarCheck, title: "No double-bookings", text: "Clashes are blocked the moment they happen." },
  { icon: Users, title: "Built for teams", text: "Invite people, see who's meeting where." },
  { icon: ShieldCheck, title: "Private workspaces", text: "Every company's data stays its own." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "authenticated") router.replace("/dashboard");
  }, [state.status, router]);

  return (
    <div className="min-h-screen bg-black p-3 md:p-4">
      <div className="grid min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl border border-white/[0.06] md:min-h-[calc(100vh-2rem)] lg:grid-cols-[1.1fr_1fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
          <video
            src={VIDEO_URL}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Darkens the footage enough for the text to stay readable. */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative">
            <Logo />
          </motion.div>

          <div className="relative">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-md text-5xl font-normal leading-[1.05] tracking-[-0.04em] text-white"
            >
              Meeting rooms,
              <br />
              without the chaos.
            </motion.h2>
            <ul className="mt-10 grid gap-3 xl:grid-cols-3">
              {POINTS.map(({ icon: Icon, title, text }, i) => (
                <motion.li
                  key={title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-md"
                >
                  <Icon className="size-5 text-white" aria-hidden />
                  <p className="mt-3 text-sm font-medium text-white">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/60">{text}</p>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        <div className="app-backdrop relative flex flex-col px-5 py-8 sm:px-10">
          <div className="flex items-center justify-between">
            <div className="lg:hidden">
              <Logo />
            </div>
            <a
              href={LANDING_URL}
              className="group ml-auto inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
              Back to home
            </a>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
