import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, resolveMediaUrl } from "../services/apiConfig";
import { mockPrograms } from "../mocks/programs";
import type { Program } from "../types";

function parseProgram(p: any): Program {
  return {
    id: p.id,
    name: p.name,
    host: p.host,
    day_of_week: p.day_of_week,
    start_time: p.start_time,
    end_time: p.end_time,
    cover_url: p.cover_url ? resolveMediaUrl(p.cover_url) : null,
    description: p.description,
  };
}

async function fetchAllPrograms(): Promise<Program[]> {
  // 1. Ambil dari server API Next.js (cepat & di-cache di memori server)
  try {
    const res = await apiFetch("/api/radio/programs");
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data.map(parseProgram);
      }
    }
  } catch {
    // Fallback ke mock jika server offline (Supabase hanya untuk auth/user)
  }

  return [...mockPrograms].map(parseProgram).sort((a, b) =>
    a.day_of_week !== b.day_of_week
      ? a.day_of_week - b.day_of_week
      : a.start_time.localeCompare(b.start_time),
  );
}

async function fetchPrograms(dayOfWeek: number): Promise<Program[]> {
  const all = await fetchAllPrograms();
  return all.filter((p) => p.day_of_week === dayOfWeek);
}

/** Programs for one day of week (0 = Minggu … 6 = Sabtu), chronological. */
export function usePrograms(dayOfWeek: number) {
  return useQuery({
    queryKey: ["programs", dayOfWeek],
    queryFn: () => fetchPrograms(dayOfWeek),
    staleTime: 5 * 60_000,
  });
}

/** Full weekly schedule (all days) — for program detail week slots. */
export function useAllPrograms() {
  return useQuery({
    queryKey: ["programs", "all"],
    queryFn: fetchAllPrograms,
    staleTime: 5 * 60_000,
  });
}

/**
 * Placeholder sinkronisasi program tanpa membuka WebSocket Supabase Realtime,
 * menghemat kuota koneksi free-tier.
 */
export function useProgramsRealtime() {
  // Realtime channel dilepas untuk menghemat kuota koneksi Supabase Free Tier.
}

/** Single program by id (from full week cache). */
export function useProgramById(id: string) {
  const all = useAllPrograms();
  const program = useMemo(
    () => all.data?.find((p) => p.id === id) ?? null,
    [all.data, id],
  );
  return { ...all, data: program };
}

/** All weekly air slots sharing the same show name. */
export function useProgramWeekSlots(programName: string | undefined) {
  const all = useAllPrograms();
  const slots = useMemo(() => {
    if (!programName || !all.data) return [];
    return all.data
      .filter((p) => p.name === programName)
      .sort((a, b) =>
        a.day_of_week !== b.day_of_week
          ? a.day_of_week - b.day_of_week
          : a.start_time.localeCompare(b.start_time),
      );
  }, [all.data, programName]);
  return { ...all, data: slots };
}

