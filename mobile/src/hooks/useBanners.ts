import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "../services/supabase";
import { mockBanners } from "../mocks/banners";
import type { Banner } from "../types";

/**
 * Dashboard banners. Falls back to mock data when Supabase is not
 * configured or the `banners` table is missing — keeps the dashboard
 * demoable without backend wiring.
 */

async function fetchBanners(): Promise<Banner[]> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured) return mockBanners;
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as Banner[]) ?? [];
}

export function useBanners() {
  const queryClient = useQueryClient();

  // Supabase Realtime: banner langsung update saat admin ubah di dashboard
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseConfigured) return;

    const channelId = `banners_realtime_${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "banners" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["banners"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["banners"],
    queryFn: fetchBanners,
    placeholderData: mockBanners,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
