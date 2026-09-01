import { useEffect, useRef, useState } from "react";

/**
 * Stats dari Icecast admin status-json.xsl (port 9005).
 * Sumber kebenaran: https://kinerja.biz.id:9005/status.xsl
 * JSON twin: https://kinerja.biz.id:9005/status-json.xsl
 *
 * Server multi-mount — kita pilih mount `gaulfm` (bukan source[0] sembarangan).
 */
export interface IcecastStats {
  listeners: number;
  /** Judul stream (biasanya nama program / "Gaul FM"). */
  streamTitle: string | null;
  /** Bitrate dalam kbps. */
  bitrate: number | null;
  /** True jika berhasil fetch + mount gaulfm ada. */
  isLive: boolean;
}

const DEFAULT_STATS: IcecastStats = {
  listeners: 0,
  streamTitle: null,
  bitrate: null,
  isLive: false,
};

/** Icecast admin status endpoint — matches https://kinerja.biz.id:9005/status.xsl */
const ICECAST_STATUS_JSON = "https://kinerja.biz.id:9005/status-json.xsl";

/** Prefer mount whose listenurl ends with /gaulfm (Gaul FM stream). */
function pickGaulSource(
  rawSource: unknown,
): Record<string, unknown> | undefined {
  const list = Array.isArray(rawSource)
    ? (rawSource as Record<string, unknown>[])
    : rawSource
      ? [rawSource as Record<string, unknown>]
      : [];

  const byListenUrl = list.find((s) => {
    const url = typeof s["listenurl"] === "string" ? s["listenurl"] : "";
    return /\/gaulfm\/?$/i.test(url) || /\/gaulfm\b/i.test(url);
  });
  if (byListenUrl) return byListenUrl;

  const byName = list.find((s) => {
    const name = typeof s["server_name"] === "string" ? s["server_name"] : "";
    return /gaul/i.test(name);
  });
  return byName ?? list[0];
}

async function fetchIcecastStats(): Promise<IcecastStats> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(ICECAST_STATUS_JSON, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return DEFAULT_STATS;

    const json = (await res.json()) as Record<string, unknown>;
    const icestats = json["icestats"] as Record<string, unknown> | undefined;
    if (!icestats) return DEFAULT_STATS;

    const source = pickGaulSource(icestats["source"]);
    if (!source) return DEFAULT_STATS;

    return {
      listeners:
        typeof source["listeners"] === "number" ? source["listeners"] : 0,
      streamTitle:
        typeof source["title"] === "string"
          ? source["title"]
          : typeof source["server_name"] === "string"
            ? source["server_name"]
            : null,
      bitrate: typeof source["bitrate"] === "number" ? source["bitrate"] : null,
      isLive: true,
    };
  } catch (err) {
    console.warn("[GaulFM] icecast stats:", err);
    return DEFAULT_STATS;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Hook yang mem-poll Icecast status setiap 30 detik.
 * Jumlah pendengar = mount gaulfm di kinerja.biz.id:9005.
 */
export function useIcecastStats(pollMs = 30_000) {
  const [stats, setStats] = useState<IcecastStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      const result = await fetchIcecastStats();
      if (mounted) {
        setStats(result);
        setLoading(false);
      }
    };

    void poll();
    timerRef.current = setInterval(() => void poll(), pollMs);

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pollMs]);

  return { stats, loading };
}
