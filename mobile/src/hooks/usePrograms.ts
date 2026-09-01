import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "../services/supabase";
import { mockPrograms } from "../mocks/programs";
import {
  getMinutesToProgram,
  isOnAirNow,
} from "../utils/datetime";
import type { Program } from "../types";

async function fetchPrograms(dayOfWeek: number): Promise<Program[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return mockPrograms.filter((p) => p.day_of_week === dayOfWeek);
  }
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("day_of_week", dayOfWeek)
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data as Program[]) ?? [];
}

async function fetchAllPrograms(): Promise<Program[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return [...mockPrograms].sort((a, b) =>
      a.day_of_week !== b.day_of_week
        ? a.day_of_week - b.day_of_week
        : a.start_time.localeCompare(b.start_time),
    );
  }
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data as Program[]) ?? [];
}

/** Programs for one day of week (0 = Minggu … 6 = Sabtu), chronological. */
export function usePrograms(dayOfWeek: number) {
  return useQuery({
    queryKey: ["programs", dayOfWeek],
    queryFn: () => fetchPrograms(dayOfWeek),
    staleTime: 60_000,
  });
}

/** Full weekly schedule (all days) — for program detail week slots. */
export function useAllPrograms() {
  return useQuery({
    queryKey: ["programs", "all"],
    queryFn: fetchAllPrograms,
    staleTime: 60_000,
  });
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

/** Unique show entry for Program catalog (one card per show name). */
export interface ProgramShow {
  name: string;
  host: string;
  cover_url: string | null;
  description: string;
  /** Slot id for ProgramDetail (prefer on-air, else next upcoming). */
  detailId: string;
  slotsPerWeek: number;
  days: number[];
  /** e.g. "06:00–10:00" or "Beragam jam" if times differ. */
  timeLabel: string;
  isOnAir: boolean;
  nextSlot: Program | null;
}

function pickDetailSlot(slots: Program[]): Program {
  const onAir = slots.find((s) => isOnAirNow(s));
  if (onAir) return onAir;
  const ranked = [...slots].sort(
    (a, b) => getMinutesToProgram(a) - getMinutesToProgram(b),
  );
  return ranked[0] ?? slots[0];
}

function buildShowCatalog(programs: Program[]): ProgramShow[] {
  const byName = new Map<string, Program[]>();
  for (const p of programs) {
    const list = byName.get(p.name) ?? [];
    list.push(p);
    byName.set(p.name, list);
  }

  const shows: ProgramShow[] = [];
  for (const [name, slots] of byName) {
    const sorted = [...slots].sort((a, b) =>
      a.day_of_week !== b.day_of_week
        ? a.day_of_week - b.day_of_week
        : a.start_time.localeCompare(b.start_time),
    );
    const detail = pickDetailSlot(sorted);
    const days = [...new Set(sorted.map((s) => s.day_of_week))].sort(
      (a, b) => a - b,
    );
    const timeKeys = new Set(
      sorted.map((s) => `${s.start_time}-${s.end_time}`),
    );
    const timeLabel =
      timeKeys.size === 1
        ? `${sorted[0].start_time}–${sorted[0].end_time}`
        : "Beragam jam";
    const isOnAir = sorted.some((s) => isOnAirNow(s));
    const nextSlot =
      [...sorted]
        .filter((s) => !isOnAirNow(s))
        .sort((a, b) => getMinutesToProgram(a) - getMinutesToProgram(b))[0] ??
      null;

    shows.push({
      name,
      host: detail.host,
      cover_url: detail.cover_url,
      description: detail.description,
      detailId: detail.id,
      slotsPerWeek: sorted.length,
      days,
      timeLabel,
      isOnAir,
      nextSlot,
    });
  }

  return shows.sort((a, b) => {
    if (a.isOnAir !== b.isOnAir) return a.isOnAir ? -1 : 1;
    const aMin = a.nextSlot
      ? getMinutesToProgram(a.nextSlot)
      : Number.MAX_SAFE_INTEGER;
    const bMin = b.nextSlot
      ? getMinutesToProgram(b.nextSlot)
      : Number.MAX_SAFE_INTEGER;
    if (aMin !== bMin) return aMin - bMin;
    return a.name.localeCompare(b.name);
  });
}

/** Catalog of unique shows (for Program browse mode on Schedule landing). */
export function useProgramCatalog() {
  const all = useAllPrograms();
  const data = useMemo(
    () => (all.data ? buildShowCatalog(all.data) : []),
    [all.data],
  );
  return { ...all, data };
}
