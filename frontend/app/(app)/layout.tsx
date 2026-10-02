"use client";

// Every page in this folder needs a login: anyone else is sent to /login.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AppShell from "@/components/AppShell";
import { BookingActionsProvider } from "@/components/BookingActions";
import { FullPageLoader } from "@/components/States";
import { useAuth } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "anonymous") router.replace("/login");
  }, [state.status, router]);

  if (state.status !== "authenticated") return <FullPageLoader />;

  return (
    <BookingActionsProvider>
      <AppShell>{children}</AppShell>
    </BookingActionsProvider>
  );
}
