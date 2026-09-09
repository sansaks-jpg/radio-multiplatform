import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "../services/supabase";
import { mockNowPlaying } from "../mocks/nowPlaying";
import { usePlayerStore } from "../stores/playerStore";
import { updateLiveMetadata } from "../services/audio/trackPlayerService";
import { useAllPrograms } from "./usePrograms";
import { isOnAirNow } from "../utils/datetime";
import { getOfficialLiveHost } from "../utils/announcer";
import type { NowPlaying, Program } from "../types";

const REFETCH_MS = 30_000;
const ON_AIR_TICK_MS = 30_000;

async function fetchNowPlaying(): Promise<NowPlaying> {
  const supabase = getSupabase();
  if (!supabase) return mockNowPlaying;
  const { data, error } = await supabase
    .from("now_playing")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as NowPlaying | null) ?? mockNowPlaying;
}

function mergeWithOnAir(
  base: NowPlaying,
  onAir: Program | null | undefined,
): NowPlaying {
  const liveHost = getOfficialLiveHost(base.current_host);
  const programName = onAir?.name || base.current_program || "Gaul FM Semarang";

  // Aturan Gaul FM: Penyiar on-air kosong KECUALI admin telah memilih penyiar di panel admin.
  if (liveHost) {
    return {
      ...base,
      current_program: programName,
      current_host: liveHost,
      current_cover_url: base.current_cover_url || onAir?.cover_url || null,
    };
  }

  // Jika belum ada penyiar yang dipilih di admin, kosongkan host (jangan fallback ke Gaul Squad).
  return {
    ...base,
    current_program: programName,
    current_host: "",
    current_cover_url: onAir?.cover_url || base.current_cover_url || null,
  };
}

export function useNowPlaying() {
  const setNowPlaying = usePlayerStore((s) => s.setNowPlaying);
  const hasStarted = usePlayerStore((s) => s.hasStarted);
  const allPrograms = useAllPrograms();

  // Re-check on-air window every 30s
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ON_AIR_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const query = useQuery({
    queryKey: ["nowPlaying"],
    queryFn: fetchNowPlaying,
    refetchInterval: REFETCH_MS,
    staleTime: REFETCH_MS / 2,
  });

  useEffect(() => {
    const base = query.data ?? mockNowPlaying;
    const onAir = allPrograms.data?.find((p) => isOnAirNow(p)) ?? null;
    const merged = mergeWithOnAir(base, onAir);
    setNowPlaying(merged);
    if (hasStarted) {
      void updateLiveMetadata(merged);
    }
  }, [query.data, allPrograms.data, setNowPlaying, hasStarted, tick]);

  return query;
}

export { isSupabaseConfigured };
