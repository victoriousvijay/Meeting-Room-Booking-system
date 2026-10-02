"use client";

// Loads data for a page with loading/error state, retry, and silent refresh.
import { useCallback, useEffect, useRef, useState } from "react";
import { describeError } from "@/lib/api";

type Entry<T> = { key: string; version: number; data: T | null; error: string | null };

/**
 * `key` identifies what is being loaded (e.g. "bookings:2026-10-02"); null means
 * "not yet" and skips the request. Bumping `refresh` reloads the same key in
 * the background: the old data stays on screen instead of flashing a skeleton.
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, refresh = 0) {
  const [attempt, setAttempt] = useState(0);
  const [entry, setEntry] = useState<Entry<T> | null>(null);
  const version = attempt + refresh;

  // The fetcher is a new function every render; keeping the latest one in a ref
  // lets the effect below depend only on what should trigger a reload.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (key === null) return;
    // Responses can arrive out of order (e.g. clicking through dates quickly);
    // `ignore` drops answers for a request that's no longer current.
    let ignore = false;
    fetcherRef.current().then(
      (data) => !ignore && setEntry({ key, version, data, error: null }),
      (err) => !ignore && setEntry({ key, version, data: null, error: describeError(err).message }),
    );
    return () => {
      ignore = true;
    };
  }, [key, version]);

  // Data for the same key from an earlier version is still shown while refreshing.
  const current = key !== null && entry?.key === key ? entry : null;
  const fresh = current?.version === version;

  return {
    data: current?.data ?? null,
    error: fresh ? (current?.error ?? null) : null,
    isLoading: key !== null && !current?.data && !fresh,
    retry: useCallback(() => setAttempt((n) => n + 1), []),
  };
}
