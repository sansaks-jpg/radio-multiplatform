import { youtubeRequest } from "@/lib/youtube-oauth";

const ACTIONS = new Set(["testing", "live", "complete"]);

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON tidak valid." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const action = typeof body.action === "string" ? body.action : "";
  if (!id || !ACTIONS.has(action)) return Response.json({ error: "Aksi siaran tidak valid." }, { status: 400 });
  try {
    const result = await youtubeRequest<{ items?: Array<{ status?: { lifeCycleStatus?: string }; contentDetails?: { boundStreamId?: string; monitorStream?: { enableMonitorStream?: boolean } } }> }>(
      `/liveBroadcasts?part=status,contentDetails&id=${encodeURIComponent(id)}`);
    const broadcast = result.items?.[0];
    if (!broadcast) return Response.json({ error: "Siaran tidak ditemukan." }, { status: 404 });
    if (action !== "complete") {
      const streamId = broadcast.contentDetails?.boundStreamId;
      if (!streamId) return Response.json({ error: "Siaran belum terhubung ke stream YouTube." }, { status: 409 });
      const streams = await youtubeRequest<{ items?: Array<{ status?: { streamStatus?: string } }> }>(
        `/liveStreams?part=status&id=${encodeURIComponent(streamId)}`);
      if (streams.items?.[0]?.status?.streamStatus !== "active") {
        return Response.json({ error: "YouTube belum menerima video. Aktifkan vMix dan tunggu status stream aktif." }, { status: 409 });
      }
      if (action === "live" && broadcast.contentDetails?.monitorStream?.enableMonitorStream && broadcast.status?.lifeCycleStatus !== "testing") {
        return Response.json({ error: "Siaran ini memakai monitor stream. Jalankan Preview/Test sebelum Go Live." }, { status: 409 });
      }
    }
    await youtubeRequest(`/liveBroadcasts/transition?part=id,status&broadcastStatus=${action}&id=${encodeURIComponent(id)}`, { method: "POST" });
    return Response.json({ ok: true, status: action });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Transisi siaran gagal." }, { status: 502 });
  }
}
