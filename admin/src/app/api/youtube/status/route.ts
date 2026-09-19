import { hasStoredYouTubeAccount, isYouTubeOAuthConfigured, youtubeRequest } from "@/lib/youtube-oauth";

type ListResponse<T> = { items?: T[] };
type Channel = { id: string; snippet?: { title?: string; thumbnails?: { default?: { url?: string } } } };
type Broadcast = { id: string; snippet?: { title?: string; description?: string; scheduledStartTime?: string; scheduledEndTime?: string; thumbnails?: { medium?: { url?: string }; default?: { url?: string } } }; status?: { lifeCycleStatus?: string; privacyStatus?: string }; contentDetails?: { boundStreamId?: string; enableAutoStart?: boolean; enableAutoStop?: boolean; enableDvr?: boolean; recordFromStart?: boolean; monitorStream?: { enableMonitorStream?: boolean } } };
type Stream = { id: string; snippet?: { title?: string }; cdn?: { ingestionType?: string; ingestionInfo?: { streamName?: string; ingestionAddress?: string } }; status?: { streamStatus?: string; healthStatus?: { status?: string; configurationIssues?: Array<{ type?: string; severity?: string; reason?: string; description?: string }> } } };

export async function GET() {
  const configured = isYouTubeOAuthConfigured();
  const connected = configured && await hasStoredYouTubeAccount();
  if (!connected) return Response.json({ configured, connected: false }, { headers: { "Cache-Control": "no-store" } });
  try {
    const [channels, upcoming, active, streams] = await Promise.all([
      youtubeRequest<ListResponse<Channel>>("/channels?part=id,snippet&mine=true"),
      youtubeRequest<ListResponse<Broadcast>>("/liveBroadcasts?part=id,snippet,status,contentDetails&broadcastStatus=upcoming&broadcastType=all&maxResults=25"),
      youtubeRequest<ListResponse<Broadcast>>("/liveBroadcasts?part=id,snippet,status,contentDetails&broadcastStatus=active&broadcastType=all&maxResults=10"),
      youtubeRequest<ListResponse<Stream>>("/liveStreams?part=id,snippet,cdn,status&mine=true&maxResults=25"),
    ]);
    const publicBroadcast = (item: Broadcast) => ({ id: item.id, title: item.snippet?.title || "Tanpa judul",
      description: item.snippet?.description || "", scheduledStartTime: item.snippet?.scheduledStartTime,
      scheduledEndTime: item.snippet?.scheduledEndTime, thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
      lifeCycleStatus: item.status?.lifeCycleStatus,
      privacyStatus: item.status?.privacyStatus, boundStreamId: item.contentDetails?.boundStreamId,
      enableAutoStart: item.contentDetails?.enableAutoStart === true,
      enableAutoStop: item.contentDetails?.enableAutoStop === true,
      enableDvr: item.contentDetails?.enableDvr !== false,
      recordFromStart: item.contentDetails?.recordFromStart !== false,
      monitorStreamEnabled: item.contentDetails?.monitorStream?.enableMonitorStream === true });
    return Response.json({ configured: true, connected: true,
      channel: channels.items?.[0] ? { id: channels.items[0].id, title: channels.items[0].snippet?.title,
        thumbnail: channels.items[0].snippet?.thumbnails?.default?.url } : null,
      broadcasts: [...(active.items || []), ...(upcoming.items || [])].map(publicBroadcast),
      streams: (streams.items || []).map(item => ({ id: item.id, title: item.snippet?.title || "Tanpa nama",
        streamKey: item.cdn?.ingestionInfo?.streamName || null,
        streamStatus: item.status?.streamStatus, healthStatus: item.status?.healthStatus?.status,
        issues: (item.status?.healthStatus?.configurationIssues || []).map(issue => ({ type: issue.type, severity: issue.severity,
          reason: issue.reason, description: issue.description })) })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ configured: true, connected: true, error: error instanceof Error ? error.message : "YouTube API gagal." }, { status: 502 });
  }
}
