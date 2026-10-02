"use client";

// Shared frame for login, sign-up and join. Logged-in visitors skip straight to the app.
import { CalendarCheck, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth";

const POINTS = [
  { icon: CalendarCheck, text: "No more double-booked rooms - clashes are blocked automatically." },
  { icon: Users, text: "See who's meeting where, and invite teammates in one step." },
  { icon: ShieldCheck, text: "Each company gets its own private workspace." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "authenticated") router.replace("/dashboard");
  }, [state.status, router]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-indigo-600 p-10 text-white lg:flex">
        <Logo light />
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight">
            Meeting rooms that just work for your whole team.
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-indigo-100">
                <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-indigo-200">Bookable 09:00 - 18:00, every working day.</p>
      </div>

      <div className="flex flex-col px-4 py-8 sm:px-6">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </div>
    </div>
  );
}
