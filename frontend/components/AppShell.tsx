"use client";

// The frame around every logged-in page: sidebar (a drawer on phones) and content.
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth, useUser } from "@/lib/auth";
import type { Me } from "@/lib/types";
import { useBookingActions } from "./BookingActions";
import Logo from "./Logo";
import { Avatar, Button, cn } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/meetings", label: "My meetings", icon: CalendarCheck },
  { href: "/find", label: "Find a room", icon: Search },
  { href: "/rooms", label: "Rooms", icon: DoorOpen },
  { href: "/people", label: "People", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Sidebar({ user, pathname, onNavigate }: { user: Me; pathname: string; onNavigate: () => void }) {
  const { signOut } = useAuth();
  const { newBooking } = useBookingActions();

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5">
        <Logo href="/dashboard" />
        <p className="mt-1 truncate text-xs text-zinc-500">{user.workspace.name}</p>
      </div>

      <div className="px-3 pt-5">
        <Button
          icon={Plus}
          className="w-full"
          onClick={() => {
            onNavigate();
            newBooking();
          }}
        >
          New booking
        </Button>
      </div>

      <nav className="mt-4 flex-1 space-y-0.5 px-3">
        {NAV.filter((item) => !item.adminOnly || user.role === "admin").map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-indigo-50 text-indigo-700" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 border-t border-zinc-200 p-4">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900">{user.name}</p>
          <p className="text-xs capitalize text-zinc-500">{user.role}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-200 bg-white lg:block">
        <Sidebar user={user} pathname={pathname} onNavigate={() => {}} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <Logo href="/dashboard" />
        <Avatar name={user.name} size="sm" />
      </header>

      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-zinc-900/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <button
                type="button"
                onClick={closeMenu}
                className="absolute right-3 top-4 rounded-md p-1 text-zinc-400 hover:bg-zinc-100"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
              <Sidebar user={user} pathname={pathname} onNavigate={closeMenu} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
