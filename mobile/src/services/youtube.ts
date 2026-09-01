/**
 * YouTube visual radio — RADIO GAUL FM (@radiogaulfm_smg).
 * Detects live / latest stream without API key (public HTML + oEmbed + RSS).
 * External YT links always prefer the native YouTube app over the browser.
 */

import { Linking, Platform } from "react-native";

export const YT_CHANNEL_HANDLE = "radiogaulfm_smg";
export const YT_CHANNEL_ID = "UCdm_p1WzUqAQ822hzWxzT2g";
export const YT_CHANNEL_URL = `https://www.youtube.com/@${YT_CHANNEL_HANDLE}`;
export const YT_STREAMS_URL = `${YT_CHANNEL_URL}/streams`;
export const YT_LIVE_URL = `${YT_CHANNEL_URL}/live`;

/** True if URL is a youtube.com / youtu.be / youtube app link. */
export function isYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    const h = u.hostname.replace(/^www\./, "").toLowerCase();
    return (
      h === "youtube.com" ||
      h === "m.youtube.com" ||
      h === "youtu.be" ||
      h === "music.youtube.com" ||
      h === "youtube-nocookie.com"
    );
  } catch {
    return /youtu\.?be/i.test(url);
  }
}

export type ParsedYouTube =
  | { kind: "video"; videoId: string; httpsUrl: string }
  | { kind: "channel"; channelId?: string; handle?: string; httpsUrl: string }
  | { kind: "generic"; httpsUrl: string };

/** Parse watch / shorts / youtu.be / @handle / channel URLs. */
export function parseYouTubeUrl(raw: string): ParsedYouTube | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (!isYouTubeUrl(url.href)) return null;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname;

  // youtu.be/<id>
  if (host === "youtu.be") {
    const id = path.replace(/^\//, "").split("/")[0];
    if (id) {
      return {
        kind: "video",
        videoId: id,
        httpsUrl: `https://www.youtube.com/watch?v=${id}`,
      };
    }
  }

  // /watch?v=
  const v = url.searchParams.get("v");
  if (v) {
    return {
      kind: "video",
      videoId: v,
      httpsUrl: `https://www.youtube.com/watch?v=${v}`,
    };
  }

  // /shorts/<id> / embed/<id> / live/<id> / v/<id>
  const m = path.match(
    /^\/(shorts|embed|live|v)\/([A-Za-z0-9_-]{6,})\/?/,
  );
  if (m?.[2]) {
    return {
      kind: "video",
      videoId: m[2],
      httpsUrl: `https://www.youtube.com/watch?v=${m[2]}`,
    };
  }

  // /@handle or /@handle/...
  const handleMatch = path.match(/^\/@([A-Za-z0-9._-]+)/);
  if (handleMatch?.[1]) {
    return {
      kind: "channel",
      handle: handleMatch[1],
      httpsUrl: `https://www.youtube.com/@${handleMatch[1]}`,
    };
  }

  // /channel/UCxxxx
  const chMatch = path.match(/^\/channel\/([A-Za-z0-9_-]+)/);
  if (chMatch?.[1]) {
    return {
      kind: "channel",
      channelId: chMatch[1],
      httpsUrl: `https://www.youtube.com/channel/${chMatch[1]}`,
    };
  }

  // /c/name / user/name
  if (/^\/(c|user)\//.test(path)) {
    return { kind: "generic", httpsUrl: url.href };
  }

  return { kind: "generic", httpsUrl: url.href };
}

/**
 * Build native-app deep links.
 * Android: intent:// forces com.google.android.youtube when installed.
 * iOS: youtube:// scheme.
 * Note: canOpenURL is unreliable on Android 11+ without <queries> — try open first.
 */
function nativeCandidates(parsed: ParsedYouTube): string[] {
  const out: string[] = [];

  if (Platform.OS === "ios") {
    if (parsed.kind === "video") {
      out.push(`youtube://watch?v=${parsed.videoId}`);
      out.push(`youtube://www.youtube.com/watch?v=${parsed.videoId}`);
    } else if (parsed.kind === "channel") {
      if (parsed.channelId) out.push(`youtube://channel/${parsed.channelId}`);
      if (parsed.handle) out.push(`youtube://www.youtube.com/@${parsed.handle}`);
      out.push(`youtube://channel/${YT_CHANNEL_ID}`);
    } else {
      out.push(`youtube://www.youtube.com`);
    }
    return out;
  }

  // Android
  if (parsed.kind === "video") {
    out.push(`vnd.youtube:${parsed.videoId}`);
    out.push(`vnd.youtube://www.youtube.com/watch?v=${parsed.videoId}`);
    // Intent forces YouTube package (opens app, not browser)
    out.push(
      `intent://www.youtube.com/watch?v=${parsed.videoId}#Intent;package=com.google.android.youtube;scheme=https;end`,
    );
  } else if (parsed.kind === "channel") {
    if (parsed.channelId) {
      out.push(`vnd.youtube://channel/${parsed.channelId}`);
      out.push(
        `intent://www.youtube.com/channel/${parsed.channelId}#Intent;package=com.google.android.youtube;scheme=https;end`,
      );
    }
    if (parsed.handle) {
      out.push(
        `intent://www.youtube.com/@${parsed.handle}#Intent;package=com.google.android.youtube;scheme=https;end`,
      );
    }
    out.push(`vnd.youtube://channel/${YT_CHANNEL_ID}`);
    out.push(
      `intent://www.youtube.com/@${YT_CHANNEL_HANDLE}#Intent;package=com.google.android.youtube;scheme=https;end`,
    );
  } else {
    // Generic path — still force YT package
    try {
      const u = new URL(parsed.httpsUrl);
      out.push(
        `intent://${u.host}${u.pathname}${u.search}#Intent;package=com.google.android.youtube;scheme=https;end`,
      );
    } catch {
      /* ignore */
    }
  }

  return out;
}

async function tryOpen(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Open any YouTube URL in the native YouTube app when possible.
 * Falls back to https (browser / system handler) only if app open fails.
 */
export async function openYouTubeUrl(url: string): Promise<void> {
  const parsed = parseYouTubeUrl(url);
  if (!parsed) {
    await tryOpen(url);
    return;
  }

  for (const candidate of nativeCandidates(parsed)) {
    // Skip canOpenURL on Android — often false for intent/vnd even when app exists.
    if (Platform.OS === "ios") {
      try {
        const ok = await Linking.canOpenURL(candidate);
        if (!ok) continue;
      } catch {
        continue;
      }
    }
    if (await tryOpen(candidate)) return;
  }

  // Last resort: https — Android may still hand off to YT app via App Links
  await tryOpen(parsed.httpsUrl);
}

/**
 * Open Gaul FM channel or a specific video in the native YouTube app.
 */
export async function openYouTube(
  target: "channel" | "video",
  videoId?: string,
): Promise<void> {
  if (target === "video" && videoId) {
    await openYouTubeUrl(`https://www.youtube.com/watch?v=${videoId}`);
    return;
  }
  await openYouTubeUrl(YT_CHANNEL_URL);
}

/**
 * Open a generic external URL — YouTube goes to native app, others to system.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (isYouTubeUrl(url)) {
    await openYouTubeUrl(url);
    return;
  }
  try {
    await Linking.openURL(url);
  } catch (err) {
    console.warn("[GaulFM] openExternalUrl:", err);
  }
}

export type YouTubeVisualStatus = "live" | "upcoming" | "offline";

export interface YouTubeVisual {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  watchUrl: string;
  embedUrl: string;
  status: YouTubeVisualStatus;
  channelTitle: string;
  /** Concurrent viewers when available (live only). */
  viewerCount: number | null;
}

const UA =
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

function decodeBasic(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function makeVisual(
  videoId: string,
  title: string,
  status: YouTubeVisualStatus,
  viewerCount: number | null = null,
): YouTubeVisual {
  return {
    videoId,
    title: decodeBasic(title) || "RADIO GAUL FM",
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`,
    status,
    channelTitle: "RADIO GAUL FM",
    viewerCount,
  };
}

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** oEmbed title for a watch URL. */
async function fetchOEmbedTitle(videoId: string): Promise<string | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { title?: string };
    return typeof json.title === "string" ? json.title : null;
  } catch {
    return null;
  }
}

/**
 * Detect live / upcoming from channel /live and /streams HTML.
 * Falls back to channel RSS latest upload when offline.
 */
export async function fetchYouTubeVisual(): Promise<YouTubeVisual | null> {
  // 1) Live page — redirects / contains videoId when on air
  const liveHtml = await fetchText(YT_LIVE_URL);
  if (liveHtml) {
    const isLive =
      /"isLiveNow"\s*:\s*true/i.test(liveHtml) ||
      /"isLive"\s*:\s*true/i.test(liveHtml) ||
      liveHtml.includes('"style":"LIVE"');
    const idMatch =
      liveHtml.match(/"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/) ||
      liveHtml.match(/watch\?v=([A-Za-z0-9_-]{11})/);
    if (isLive && idMatch?.[1]) {
      const title =
        (await fetchOEmbedTitle(idMatch[1])) ??
        liveHtml.match(/"title"\s*:\s*"([^"]{3,120})"/)?.[1] ??
        "Live · RADIO GAUL FM";
      const viewersRaw = liveHtml.match(
        /"concurrentViewers"\s*:\s*"?(\d+)"?/,
      );
      const viewers = viewersRaw ? Number(viewersRaw[1]) : null;
      return makeVisual(idMatch[1], title, "live", viewers);
    }
  }

  // 2) Streams tab — upcoming or recent live VODs
  const streamsHtml = await fetchText(YT_STREAMS_URL);
  if (streamsHtml) {
    const upcoming =
      streamsHtml.match(
        /"style"\s*:\s*"UPCOMING"[\s\S]{0,400}?"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/,
      ) ||
      streamsHtml.match(
        /"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"[\s\S]{0,400}?"style"\s*:\s*"UPCOMING"/,
      );
    if (upcoming?.[1]) {
      const title =
        (await fetchOEmbedTitle(upcoming[1])) ?? "Segera · RADIO GAUL FM";
      return makeVisual(upcoming[1], title, "upcoming");
    }

    const anyId = streamsHtml.match(/"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/);
    if (anyId?.[1]) {
      const title =
        (await fetchOEmbedTitle(anyId[1])) ?? "Stream · RADIO GAUL FM";
      return makeVisual(anyId[1], title, "offline");
    }
  }

  // 3) Channel RSS — latest upload
  const rss = await fetchText(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`,
  );
  if (rss) {
    const entry = rss.match(
      /<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>[\s\S]*?<media:title[^>]*>([^<]+)<\/media:title>/,
    );
    if (entry?.[1]) {
      return makeVisual(entry[1], entry[2] ?? "RADIO GAUL FM", "offline");
    }
  }

  return null;
}
