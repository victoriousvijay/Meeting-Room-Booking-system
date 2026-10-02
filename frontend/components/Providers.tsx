"use client";

import { MotionConfig } from "framer-motion";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "./Toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Respect the OS "reduce motion" setting for every animation in the app.
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
