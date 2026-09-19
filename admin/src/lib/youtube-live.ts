import { hasStoredYouTubeAccount, isYouTubeOAuthConfigured, youtubeRequest } from "./youtube-oauth";
import { getServerLiveState } from "./radio-bus";

type ListResponse<T> = { items?: T[] };
type Broadcast = {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    scheduledStartTime?: string;
  };
  status?: {
    lifeCycleStatus?: string;
    privacyStatus?: string;
  };
  contentDetails?: {
    boundStreamId?: string;
    enableAutoStart?: boolean;
    enableAutoStop?: boolean;
    monitorStream?: { enableMonitorStream?: boolean };
  };
};

type Stream = {
  id: string;
  snippet?: { title?: string };
  cdn?: { ingestionInfo?: { streamName?: string } };
  status?: { streamStatus?: string };
};

/**
 * Memastikan ada Live Broadcast yang aktif dan terikat ke stream YouTube.
 * Jika belum ada broadcast, sistem otomatis membuatkan tayangan publik live tanpa operator harus membuat jadwal manual.
 */
export async function ensureActiveYouTubeBroadcast(preferredStreamId?: string) {
  if (!isYouTubeOAuthConfigured() || !(await hasStoredYouTubeAccount())) {
    return { error: "OAuth YouTube belum terhubung." };
  }

  try {
    // 1. Ambil daftar broadcast aktif, upcoming, dan stream yang tersedia
    const [activeRes, upcomingRes, streamsRes] = await Promise.all([
      youtubeRequest<ListResponse<Broadcast>>("/liveBroadcasts?part=id,snippet,status,contentDetails&broadcastStatus=active&broadcastType=all&maxResults=5"),
      youtubeRequest<ListResponse<Broadcast>>("/liveBroadcasts?part=id,snippet,status,contentDetails&broadcastStatus=upcoming&broadcastType=all&maxResults=10"),
      youtubeRequest<ListResponse<Stream>>("/liveStreams?part=id,snippet,cdn,status&mine=true&maxResults=10"),
    ]);

    const activeList = activeRes.items || [];
    const upcomingList = upcomingRes.items || [];
    const streamList = streamsRes.items || [];

    // Cari stream target
    const targetStream =
      streamList.find((s) => s.id === preferredStreamId) ||
      streamList.find((s) => s.status?.streamStatus === "active") ||
      streamList.find((s) => s.snippet?.title?.toLowerCase().includes("default")) ||
      streamList[0];

    if (!targetStream) {
      return { error: "Tidak ada stream key / stream ingestion yang ditemukan di akun YouTube." };
    }

    // Dapatkan judul dan deskripsi default sesuai format baku
    let liveTitle = "Gaul FM – The Best Visual Radio Station";
    try {
      const radioState = await getServerLiveState();
      const progName = radioState?.nowPlaying?.current_program;
      if (progName && progName.trim()) {
        liveTitle = `${progName.trim()} | Gaul FM – The Best Visual Radio Station`;
      }
    } catch {
      // Fallback ke judul default
    }
    const liveDescription = `${liveTitle}\nWebsite: https://radiogaulfmsmg.com`;

    // 2. Jika sudah ada broadcast yang sedang live
    const currentLive = activeList.find(
      (b) => b.status?.lifeCycleStatus === "live" || b.status?.lifeCycleStatus === "testing"
    );
    if (currentLive) {
      // Sinkronkan judul & deskripsi jika belum sesuai format baru
      if (!currentLive.snippet?.title?.includes("The Best Visual Radio Station")) {
        try {
          await youtubeRequest("/liveBroadcasts?part=id,snippet,status", {
            method: "PUT",
            body: JSON.stringify({
              id: currentLive.id,
              snippet: {
                title: liveTitle,
                description: liveDescription,
                scheduledStartTime: currentLive.snippet?.scheduledStartTime || new Date().toISOString(),
              },
              status: {
                privacyStatus: currentLive.status?.privacyStatus || "public",
                selfDeclaredMadeForKids: false,
              },
            }),
          });
        } catch {
          // Non-fatal
        }
      }
      return {
        broadcastId: currentLive.id,
        title: liveTitle,
        status: currentLive.status?.lifeCycleStatus || "live",
        watchUrl: `https://www.youtube.com/watch?v=${currentLive.id}`,
        created: false,
      };
    }

    // 3. Jika ada broadcast upcoming yang sudah terikat ke stream target
    const boundUpcoming = upcomingList.find((b) => b.contentDetails?.boundStreamId === targetStream.id);
    if (boundUpcoming) {
      // Sinkronkan judul & deskripsi jika belum sesuai format baru
      if (!boundUpcoming.snippet?.title?.includes("The Best Visual Radio Station")) {
        try {
          await youtubeRequest("/liveBroadcasts?part=id,snippet,status", {
            method: "PUT",
            body: JSON.stringify({
              id: boundUpcoming.id,
              snippet: {
                title: liveTitle,
                description: liveDescription,
                scheduledStartTime: boundUpcoming.snippet?.scheduledStartTime || new Date().toISOString(),
              },
              status: {
                privacyStatus: boundUpcoming.status?.privacyStatus || "public",
                selfDeclaredMadeForKids: false,
              },
            }),
          });
        } catch {
          // Non-fatal
        }
      }
      // Jika stream sudah aktif menerima video dan auto-start belum memicu, coba transisi
      if (targetStream.status?.streamStatus === "active") {
        try {
          await youtubeRequest(
            `/liveBroadcasts/transition?part=id,status&broadcastStatus=live&id=${encodeURIComponent(boundUpcoming.id)}`,
            { method: "POST" }
          );
        } catch {
          // Abaikan error transisi jika autoStart sudah menanganinya
        }
      }
      return {
        broadcastId: boundUpcoming.id,
        title: liveTitle,
        status: boundUpcoming.status?.lifeCycleStatus || "ready",
        watchUrl: `https://www.youtube.com/watch?v=${boundUpcoming.id}`,
        created: false,
      };
    }

    // 4. JIKA BELUM ADA BROADCAST: Buat otomatis broadcast baru secara instan!
    const newBroadcast = await youtubeRequest<Broadcast>(
      "/liveBroadcasts?part=id,snippet,status,contentDetails",
      {
        method: "POST",
        body: JSON.stringify({
          snippet: {
            title: liveTitle,
            description: liveDescription,
            scheduledStartTime: new Date().toISOString(),
          },
          status: {
            privacyStatus: "public",
            selfDeclaredMadeForKids: false,
          },
          contentDetails: {
            enableAutoStart: true,
            enableAutoStop: true,
            enableDvr: true,
            recordFromStart: true,
            monitorStream: { enableMonitorStream: false, broadcastStreamDelayMs: 0 },
          },
        }),
      }
    );

    // 5. Kaitkan (bind) broadcast baru ke stream key target
    await youtubeRequest(
      `/liveBroadcasts/bind?part=id,contentDetails&id=${encodeURIComponent(newBroadcast.id)}&streamId=${encodeURIComponent(targetStream.id)}`,
      { method: "POST" }
    );

    // 6. Jika video sudah mengalir ke YouTube saat ini, coba transisikan langsung ke "live"
    if (targetStream.status?.streamStatus === "active") {
      try {
        await youtubeRequest(
          `/liveBroadcasts/transition?part=id,status&broadcastStatus=live&id=${encodeURIComponent(newBroadcast.id)}`,
          { method: "POST" }
        );
      } catch {
        // Auto-start YouTube akan memicu dalam hitungan detik
      }
    }

    return {
      broadcastId: newBroadcast.id,
      title: liveTitle,
      status: "live",
      watchUrl: `https://www.youtube.com/watch?v=${newBroadcast.id}`,
      created: true,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Gagal sinkronisasi siaran YouTube." };
  }
}

/**
 * Mengakhiri siaran aktif di YouTube saat operator mematikan tombol siaran di admin
 */
export async function stopActiveYouTubeBroadcasts() {
  if (!isYouTubeOAuthConfigured() || !(await hasStoredYouTubeAccount())) return;
  try {
    const activeRes = await youtubeRequest<ListResponse<Broadcast>>(
      "/liveBroadcasts?part=id,status&broadcastStatus=active&broadcastType=all&maxResults=5"
    );
    const activeList = activeRes.items || [];
    for (const b of activeList) {
      if (b.status?.lifeCycleStatus === "live" || b.status?.lifeCycleStatus === "testing") {
        try {
          await youtubeRequest(
            `/liveBroadcasts/transition?part=id,status&broadcastStatus=complete&id=${encodeURIComponent(b.id)}`,
            { method: "POST" }
          );
        } catch {
          // Abaikan jika sudah diakhiri oleh YouTube
        }
      }
    }
  } catch {
    // Non-fatal
  }
}
