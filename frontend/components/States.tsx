"use client";

// Loading skeletons and the error state shared by every page.
import { motion } from "framer-motion";
import { CloudOff, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "./Logo";
import { Button, cn } from "./ui";

// Render's free tier sleeps when idle and the first request can take close to
// a minute. Without a hint that looks like the app is broken.
function useSlowHint(delay = 4000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return slow;
}

function SlowHint() {
  return (
    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 text-sm text-white/50">
      Waking up the server - the first load after a quiet spell can take up to a minute.
    </motion.p>
  );
}

export function Skeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  const slow = useSlowHint();
  return (
    <div aria-busy="true" aria-label="Loading" className={className}>
      {slow && <SlowHint />}
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="glass rounded-2xl p-5">
            <div className="skeleton h-4 w-1/3 rounded-md" />
            <div className="skeleton mt-3 h-3 w-2/3 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  const slow = useSlowHint();
  return (
    <div aria-busy="true" aria-label="Loading" className={className}>
      {slow && <SlowHint />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="glass h-40 rounded-2xl p-5">
            <div className="skeleton h-4 w-1/2 rounded-md" />
            <div className="skeleton mt-3 h-3 w-1/3 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass flex flex-col items-center rounded-2xl px-6 py-14 text-center", className)}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-red-500/10 text-red-300 ring-1 ring-red-400/20">
        <CloudOff className="size-5" aria-hidden />
      </span>
      <p className="mt-4 font-medium text-white">Couldn&apos;t load this</p>
      <p className="mt-1 max-w-sm text-sm text-white/50">{message}</p>
      <Button variant="secondary" icon={RotateCw} onClick={onRetry} className="mt-5">
        Try again
      </Button>
    </motion.div>
  );
}

export function FullPageLoader() {
  const slow = useSlowHint();
  return (
    <div className="app-backdrop flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, ease: "linear", repeat: Infinity }}
        aria-label="Loading"
        role="img"
      >
        <LogoMark className="size-10" />
      </motion.div>
      {slow && <SlowHint />}
    </div>
  );
}
