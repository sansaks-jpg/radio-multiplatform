import { NextResponse } from "next/server";
import { ensureActiveYouTubeBroadcast, stopActiveYouTubeBroadcasts } from "@/lib/youtube-live";
import { youtubeRequest } from "@/lib/youtube-oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await youtubeRequest<{ items?: Array<{ id: string; snippet?: { title?: string }; status?: { lifeCycleStatus?: string } }> }>(
      "/liveBroadcasts?part=id,snippet,status&broadcastStatus=active&broadcastType=all&maxResults=1"
    );
    const item = res.items?.[0];
    if (item && (item.status?.lifeCycleStatus === "live" || item.status?.lifeCycleStatus === "testing")) {
      return NextResponse.json({
        active: true,
        broadcastId: item.id,
        title: item.snippet?.title || "Siaran Live",
        watchUrl: `https://www.youtube.com/watch?v=${item.id}`,
      });
    }
    return NextResponse.json({ active: false });
  } catch {
    return NextResponse.json({ active: false });
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // Body kosong diperbolehkan
  }

  const action = body.action === "stop" ? "stop" : "start";
  const streamId = typeof body.streamId === "string" ? body.streamId : undefined;

  if (action === "stop") {
    await stopActiveYouTubeBroadcasts();
    return NextResponse.json({ ok: true, action: "stop" });
  }

  const result = await ensureActiveYouTubeBroadcast(streamId);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, action: "start", ...result });
}
