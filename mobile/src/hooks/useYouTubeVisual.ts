import { useQuery } from "@tanstack/react-query";
import {
  fetchYouTubeVisual,
  type YouTubeVisual,
} from "../services/youtube";

/**
 * Auto-detect Gaul FM YouTube visual stream (live / upcoming / latest).
 * Polls more often while live so status stays fresh.
 */
export function useYouTubeVisual() {
  return useQuery({
    queryKey: ["youtube-visual"],
    queryFn: fetchYouTubeVisual,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    refetchInterval: (query) => {
      const data = query.state.data as YouTubeVisual | null | undefined;
      if (data?.status === "live") return 45_000;
      if (data?.status === "upcoming") return 90_000;
      return 3 * 60_000;
    },
    retry: 1,
  });
}
