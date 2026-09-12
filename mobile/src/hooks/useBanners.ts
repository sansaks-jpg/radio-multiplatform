import { useQuery } from "@tanstack/react-query";
import { buildApiUrl, resolveMediaUrl } from "../services/apiConfig";
import { mockBanners } from "../mocks/banners";
import type { Banner } from "../types";

/**
 * Dashboard banners. Mengambil data dari server Next.js API (di-cache),
 * dengan fallback ke mock data lokal.
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
    // Fallback ke mock jika server offline (Supabase hanya untuk auth/user)
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
