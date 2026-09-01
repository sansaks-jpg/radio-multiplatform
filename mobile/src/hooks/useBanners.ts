import { useQuery } from "@tanstack/react-query";
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
  return useQuery({
    queryKey: ["banners"],
    queryFn: fetchBanners,
    staleTime: 5 * 60_000,
  });
}
