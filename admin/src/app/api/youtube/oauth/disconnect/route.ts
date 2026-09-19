import { disconnectYouTubeAccount } from "@/lib/youtube-oauth";
import { cleanupDanglingYouTubeBroadcasts } from "@/lib/youtube-live";

export async function DELETE() {
  try {
    // 1. Bersihkan semua siaran upcoming dan active yang nyangkut di YouTube SEBELUM token dicabut
    try {
      await cleanupDanglingYouTubeBroadcasts({ onlyGaulFm: true });
    } catch {
      // Non-fatal, lanjutkan proses disconnect
    }

    // 2. Hentikan engine restream jika masih menyala
    try {
      const STREAM_ENGINE_API_URL = process.env.STREAM_ENGINE_API_URL || "http://127.0.0.1:8092/config";
      await fetch(STREAM_ENGINE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtube_enabled: false }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Non-fatal
    }

    // 3. Cabut token OAuth dan hapus dari storage server
    return Response.json(await disconnectYouTubeAccount(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal memutuskan akun YouTube." }, { status: 500 });
  }
}
