"use client";

import { MotionConfig } from "framer-motion";
import { ToastProvider } from "./Toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Respect the OS "reduce motion" setting for every animation in the app.
    <MotionConfig reducedMotion="user">
      <ToastProvider>{children}</ToastProvider>
    </MotionConfig>
  );
}
