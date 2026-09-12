import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "../services/supabase";
import { buildApiUrl, resolveMediaUrl } from "../services/apiConfig";
import { mockBanners } from "../mocks/banners";
import type { Banner } from "../types";

/**
 * Dashboard banners. Mengambil data dari server Next.js API (di-cache),
 * dengan fallback ke Supabase / mock data.
 */

function parseBanner(b: any): Banner {
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle ?? null,
    image_url: resolveMediaUrl(b.image_url),
    cta_label: b.cta_label ?? null,
    link_to: b.link_to ?? null,
    link_url: b.link_url ?? null,
    type: b.type ?? "program",
    sort_order: b.sort_order ?? 0,
    is_active: b.is_active ?? true,
  };
}

async function fetchBanners(): Promise<Banner[]> {
  // 1. Ambil dari server API Next.js
  try {
    const url = buildApiUrl("/api/radio/banners");
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data.map(parseBanner);
      }
    }
  } catch {
    // Fallback
  }

  // 2. Fallback darurat ke Supabase jika server Next.js offline
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map(parseBanner);
      }
    } catch {
      // Fallback
    }
  }

  return mockBanners.map(parseBanner);
}

export function useBanners() {
  return useQuery({
    queryKey: ["banners"],
    queryFn: fetchBanners,
    placeholderData: mockBanners,
    staleTime: 10 * 60_000,
    refetchInterval: 10 * 60_000,
  });
}
