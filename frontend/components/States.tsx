"use client";

// Loading skeletons and the error state shared by every page.
import { CloudOff, LoaderCircle, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
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
    <p className="mb-3 text-sm text-zinc-500">
      Waking up the server - the first load after a quiet spell can take up to a minute.
    </p>
  );
}

export function Skeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  const slow = useSlowHint();
  return (
    <div aria-busy="true" aria-label="Loading" className={className}>
      {slow && <SlowHint />}
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-zinc-200 bg-white p-4">
            <div className="h-4 w-1/3 rounded bg-zinc-200" />
            <div className="mt-2 h-3 w-2/3 rounded bg-zinc-100" />
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
          <div key={i} className="h-36 animate-pulse rounded-xl border border-zinc-200 bg-white p-4">
            <div className="h-4 w-1/2 rounded bg-zinc-200" />
            <div className="mt-2 h-3 w-1/3 rounded bg-zinc-100" />
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
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center",
        className,
      )}
    >
      <CloudOff className="size-8 text-zinc-400" aria-hidden />
      <p className="mt-3 font-medium text-zinc-900">Couldn&apos;t load this</p>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{message}</p>
      <Button variant="secondary" icon={RotateCw} onClick={onRetry} className="mt-4">
        Try again
      </Button>
    </div>
  );
}

export function FullPageLoader() {
  const slow = useSlowHint();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <LoaderCircle className="size-6 animate-spin text-indigo-600" aria-label="Loading" />
      {slow && <SlowHint />}
    </div>
  );
}
