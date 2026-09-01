import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "../services/supabase";
import {
  fetchWpNewsById,
  fetchWpNewsPage,
  type WpNewsPage,
} from "../services/wordpress";
import { mockNews } from "../mocks/news";
import type { NewsItem } from "../types";

export const NEWS_PAGE_SIZE = 15;

export type NewsPage = WpNewsPage;

async function fetchNewsPage(pageParam: number): Promise<NewsPage> {
  const supabase = getSupabase();

  // Production path: Supabase `news` table (synced from WP via edge function).
  if (supabase) {
    const from = pageParam * NEWS_PAGE_SIZE;
    const to = from + NEWS_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .order("published_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    const items = (data as NewsItem[]) ?? [];
    return {
      items,
      nextPage: items.length === NEWS_PAGE_SIZE ? pageParam + 1 : null,
    };
  }

  // Prototype / Demo mode without Supabase
  if (!isSupabaseConfigured) {
    const start = pageParam * NEWS_PAGE_SIZE;
    const items = mockNews.slice(start, start + NEWS_PAGE_SIZE);
    return {
      items,
      nextPage: start + NEWS_PAGE_SIZE < mockNews.length ? pageParam + 1 : null,
    };
  }

  return await fetchWpNewsPage(pageParam);
}

/**
 * Infinite news feed — WP live when no Supabase, else Supabase table.
 * Cache persisted to AsyncStorage (offline ≥15 items, NFR 7.3).
 */
export function useNews() {
  return useInfiniteQuery({
    queryKey: ["news", "v2"],
    queryFn: ({ pageParam }) => fetchNewsPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 5 * 60_000,
    gcTime: 24 * 3600 * 1000,
  });
}

/** Flattened helper for screens. */
export function flattenNewsPages(pages: NewsPage[] | undefined): NewsItem[] {
  return pages?.flatMap((page) => page.items) ?? [];
}

/**
 * Single article — cache first, then WP / mock by id.
 * Used by NewsDetail when opening a deep link or cold start.
 */
export function useNewsItem(id: string | undefined) {
  return useQuery({
    queryKey: ["news", "item", id],
    enabled: Boolean(id),
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<NewsItem | null> => {
      if (!id) return null;
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from("news")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        return (data as NewsItem | null) ?? null;
      }
      if (!isSupabaseConfigured) {
        return mockNews.find((n) => n.id === id) ?? null;
      }
      return (await fetchWpNewsById(id)) ?? null;
    },
  });
}
