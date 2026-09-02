import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  fetchWpNewsById,
  fetchWpNewsPage,
  type WpNewsPage,
} from "../services/wordpress";
import type { NewsItem } from "../types";

export const NEWS_PAGE_SIZE = 10;

export type NewsPage = WpNewsPage;

/**
 * Infinite news feed — direct fetch from WordPress REST API (radiogaulfmsmg.com).
 * Cache persisted to AsyncStorage (offline support via PersistQueryClientProvider).
 */
export function useNews() {
  return useInfiniteQuery({
    queryKey: ["news", "v2"],
    queryFn: ({ pageParam }) => fetchWpNewsPage(pageParam),
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
 * Single article — cache first, then WordPress REST API by id.
 * Used by NewsDetail when opening a deep link or cold start.
 */
export function useNewsItem(id: string | undefined) {
  return useQuery({
    queryKey: ["news", "item", id],
    enabled: Boolean(id),
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<NewsItem | null> => {
      if (!id) return null;
      return (await fetchWpNewsById(id)) ?? null;
    },
  });
}

