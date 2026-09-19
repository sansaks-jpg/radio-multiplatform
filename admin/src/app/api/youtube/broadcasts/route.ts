import { youtubeRequest } from "@/lib/youtube-oauth";

const PRIVACY = new Set(["private", "unlisted", "public"]);

function boolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON tidak valid." }, { status: 400 }); }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const scheduledStartTime = typeof body.scheduledStartTime === "string" ? body.scheduledStartTime : "";
  const privacyStatus = typeof body.privacyStatus === "string" ? body.privacyStatus : "unlisted";
  const streamId = typeof body.streamId === "string" ? body.streamId.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const scheduledEndTime = typeof body.scheduledEndTime === "string" ? body.scheduledEndTime : "";
  if (!title || title.length > 100 || description.length > 5000 || !scheduledStartTime || Number.isNaN(Date.parse(scheduledStartTime)) ||
      (scheduledEndTime && (Number.isNaN(Date.parse(scheduledEndTime)) || Date.parse(scheduledEndTime) <= Date.parse(scheduledStartTime))) ||
      !PRIVACY.has(privacyStatus) || !streamId) {
    return Response.json({ error: "Judul, jadwal, privasi, atau stream YouTube tidak valid." }, { status: 400 });
  }
  try {
    const broadcast = await youtubeRequest<{ id: string }>("/liveBroadcasts?part=id,snippet,status,contentDetails", {
      method: "POST",
      body: JSON.stringify({ snippet: { title, description, scheduledStartTime: new Date(scheduledStartTime).toISOString(),
        ...(scheduledEndTime ? { scheduledEndTime: new Date(scheduledEndTime).toISOString() } : {}) },
        status: { privacyStatus, selfDeclaredMadeForKids: false },
        contentDetails: { enableAutoStart: boolean(body.enableAutoStart, true), enableAutoStop: boolean(body.enableAutoStop, true),
          enableDvr: boolean(body.enableDvr, true), recordFromStart: boolean(body.recordFromStart, true),
          monitorStream: { enableMonitorStream: false, broadcastStreamDelayMs: 0 } } }),
    });
    await youtubeRequest(`/liveBroadcasts/bind?part=id,contentDetails&id=${encodeURIComponent(broadcast.id)}&streamId=${encodeURIComponent(streamId)}`, { method: "POST" });
    return Response.json({ id: broadcast.id, watchUrl: `https://www.youtube.com/watch?v=${broadcast.id}` }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal membuat siaran." }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON tidak valid." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const privacyStatus = typeof body.privacyStatus === "string" ? body.privacyStatus : "";
  const scheduledStartTime = typeof body.scheduledStartTime === "string" ? body.scheduledStartTime : "";
  const scheduledEndTime = typeof body.scheduledEndTime === "string" ? body.scheduledEndTime : "";
  const streamId = typeof body.streamId === "string" ? body.streamId.trim() : "";
  if (!id || !title || title.length > 100 || description.length > 5000 || !PRIVACY.has(privacyStatus) ||
      !scheduledStartTime || Number.isNaN(Date.parse(scheduledStartTime)) ||
      (scheduledEndTime && (Number.isNaN(Date.parse(scheduledEndTime)) || Date.parse(scheduledEndTime) <= Date.parse(scheduledStartTime)))) {
    return Response.json({ error: "Data siaran tidak valid." }, { status: 400 });
  }
  try {
    const current = await youtubeRequest<{ items?: Array<{ id: string; snippet?: { scheduledStartTime?: string }; status?: { lifeCycleStatus?: string; selfDeclaredMadeForKids?: boolean }; contentDetails?: { boundStreamId?: string; enableEmbed?: boolean; monitorStream?: { enableMonitorStream?: boolean; broadcastStreamDelayMs?: number } } }> }>(
      `/liveBroadcasts?part=id,snippet,status,contentDetails&id=${encodeURIComponent(id)}`);
    const item = current.items?.[0];
    if (!item?.snippet?.scheduledStartTime) return Response.json({ error: "Siaran tidak ditemukan." }, { status: 404 });
    const upcoming = item.status?.lifeCycleStatus !== "live";
    const parts = upcoming ? "id,snippet,status,contentDetails" : "id,snippet,status";
    await youtubeRequest(`/liveBroadcasts?part=${parts}`, { method: "PUT",
      body: JSON.stringify({ id,
        snippet: { title, description, scheduledStartTime: upcoming ? new Date(scheduledStartTime).toISOString() : item.snippet.scheduledStartTime,
          ...(upcoming && scheduledEndTime ? { scheduledEndTime: new Date(scheduledEndTime).toISOString() } : {}) },
        status: { privacyStatus, selfDeclaredMadeForKids: item.status?.selfDeclaredMadeForKids === true },
        ...(upcoming ? { contentDetails: { enableAutoStart: boolean(body.enableAutoStart, true),
          enableAutoStop: boolean(body.enableAutoStop, true), enableDvr: boolean(body.enableDvr, true),
          recordFromStart: boolean(body.recordFromStart, true), enableEmbed: item.contentDetails?.enableEmbed !== false,
          monitorStream: { enableMonitorStream: item.contentDetails?.monitorStream?.enableMonitorStream === true,
            broadcastStreamDelayMs: item.contentDetails?.monitorStream?.broadcastStreamDelayMs || 0 } } } : {}) }) });
    if (upcoming && streamId && streamId !== item.contentDetails?.boundStreamId) {
      await youtubeRequest(`/liveBroadcasts/bind?part=id,contentDetails&id=${encodeURIComponent(id)}&streamId=${encodeURIComponent(streamId)}`, { method: "POST" });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal memperbarui judul." }, { status: 502 });
  }
}
