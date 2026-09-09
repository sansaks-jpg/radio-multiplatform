import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

/**
 * Stream integration contract (MOBILE_FRONTEND_PLAN.md §0):
 * the .m3u playlist resolves to the Icecast-style progressive stream.
 */
export const PLAYLIST_URL: string =
  (extra.streamPlaylistUrl as string) ??
  process.env.EXPO_PUBLIC_STREAM_URL ??
  "http://27.50.19.173:9000/gaulfm.m3u";
export const FALLBACK_STREAM_URL: string =
  (extra.streamFallbackUrl as string) ?? "http://27.50.19.173:9000/gaulfm";

/**
 * Resolve the playlist once (fetch → first non-comment line) with a hard
 * timeout, falling back to the known stream URL when unreachable.
 */
export async function resolveStreamUrl(timeoutMs = 5000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(PLAYLIST_URL, { signal: controller.signal });
    if (!response.ok) {
      return FALLBACK_STREAM_URL;
    }
    const text = await response.text();
    // Safety check: M3U playlist should be small plain text, not HTML error pages (> 64KB)
    if (text.length > 65536 || text.trim().startsWith("<")) {
      return FALLBACK_STREAM_URL;
    }
    const line = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith("#"));

    if (!line) {
      return FALLBACK_STREAM_URL;
    }

    // Handle absolute http/https URLs
    if (/^https?:\/\//i.test(line)) {
      return line;
    }

    // Handle relative path in M3U playlist
    if (line.startsWith("/")) {
      const parsedPlaylist = new URL(PLAYLIST_URL);
      return `${parsedPlaylist.origin}${line}`;
    }

    return FALLBACK_STREAM_URL;
  } catch {
    return FALLBACK_STREAM_URL;
  } finally {
    clearTimeout(timer);
  }
}
