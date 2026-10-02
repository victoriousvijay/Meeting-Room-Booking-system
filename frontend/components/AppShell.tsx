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
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth, useUser } from "@/lib/auth";
import type { Me } from "@/lib/types";
import { useBookingActions } from "./BookingActions";
import Logo from "./Logo";
import { Avatar, Button, cn } from "./ui";

type NavItem = { href: string; label: string; icon: LucideIcon };

const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/meetings", label: "My meetings", icon: CalendarCheck },
  { href: "/find", label: "Find a room", icon: Search },
];

const WORKSPACE_NAV: NavItem[] = [
  { href: "/rooms", label: "Rooms", icon: DoorOpen },
  { href: "/people", label: "People", icon: Users },
];

const ADMIN_NAV: NavItem[] = [{ href: "/analytics", label: "Analytics", icon: BarChart3 }];

const SETTINGS_NAV: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }];

function NavLinks({
  items,
  pathname,
  indicatorId,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  indicatorId: string;
  onNavigate: () => void;
}) {
  return (
    <>
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active ? "text-white" : "text-white/50 hover:bg-white/[0.04] hover:text-white/90",
            )}
          >
            {active && (
              // Slides between items instead of jumping, so the eye can follow it.
              <motion.span
                layoutId={indicatorId}
                className="absolute inset-0 rounded-xl bg-white/[0.07] ring-1 ring-white/10"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              >
                <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-indigo-400" />
              </motion.span>
            )}
            <Icon className="relative size-4" aria-hidden />
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Sidebar({
  user,
  pathname,
  indicatorId,
  onNavigate,
}: {
  user: Me;
  pathname: string;
  indicatorId: string;
  onNavigate: () => void;
}) {
  const { signOut } = useAuth();
  const { newBooking } = useBookingActions();
  const links = { pathname, indicatorId, onNavigate };

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6">
        <Logo href="/dashboard" />
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
          <span className="grid size-6 place-items-center rounded-md bg-gradient-to-br from-indigo-400 to-violet-500 text-[11px] font-bold text-white">
            {user.workspace.name[0]?.toUpperCase()}
          </span>
          <span className="truncate text-xs font-medium text-white/80">{user.workspace.name}</span>
        </div>
      </div>

      <div className="px-4 pt-5">
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

      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto px-3">
        <Section title="Book">
          <NavLinks items={MAIN_NAV} {...links} />
        </Section>
        <Section title="Workspace">
          <NavLinks items={WORKSPACE_NAV} {...links} />
          {user.role === "admin" && <NavLinks items={ADMIN_NAV} {...links} />}
          <NavLinks items={SETTINGS_NAV} {...links} />
        </Section>
      </nav>

      <div className="m-3 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs capitalize text-white/40">{user.role}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white"
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
    <div className="relative min-h-screen">
      {/* Fixed glow and grid behind everything, so scrolling content floats over it. */}
      <div aria-hidden className="app-backdrop fixed inset-0 -z-10">
        <div className="app-grid absolute inset-0" />
      </div>

      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/[0.06] bg-black/30 backdrop-blur-xl lg:block">
        <Sidebar user={user} pathname={pathname} indicatorId="nav-desktop" onNavigate={() => {}} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-black/50 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="rounded-lg p-1.5 text-white/70 hover:bg-white/[0.06]"
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
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 w-72 border-r border-white/10 bg-[#0b0b11]"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <button
                type="button"
                onClick={closeMenu}
                className="absolute right-3 top-5 rounded-lg p-1 text-white/40 hover:bg-white/[0.06] hover:text-white"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
              <Sidebar user={user} pathname={pathname} indicatorId="nav-mobile" onNavigate={closeMenu} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
