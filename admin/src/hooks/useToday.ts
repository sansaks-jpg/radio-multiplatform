"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Menghitung hari saat ini dalam zona waktu WIB (UTC+7).
 * 0 = Minggu, 1 = Senin, ..., 6 = Sabtu (sesuai JS Date.getDay)
 */
function getWibDay(): number {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const wib = new Date(utcMs + 7 * 3600000);
  return wib.getDay();
}

/**
 * Current day-of-week (0=Sun..6=Sat) in WIB (UTC+7), hydration-safe.
 * Server render returns fallback (1=Mon), client renders real live WIB day.
 */
export function useToday(): number {
  return useSyncExternalStore(
    emptySubscribe,
    getWibDay,
    () => 1,
  );
}

