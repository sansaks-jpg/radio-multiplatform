"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/data-store";
import type { AdminSnapshot } from "@/lib/types";

/** Reactive admin snapshot (demo localStorage or future Supabase). */
export function useAdminStore(): AdminSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
