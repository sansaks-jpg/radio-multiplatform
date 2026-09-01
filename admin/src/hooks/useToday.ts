"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Current day-of-week (0=Sun..6=Sat), hydration-safe.
 * Server render and first client render both return the same fallback (1=Mon),
 * so there is no hydration mismatch; the client then re-renders with the real day.
 */
export function useToday(): number {
  return useSyncExternalStore(
    emptySubscribe,
    () => new Date().getDay(),
    () => 1,
  );
}
