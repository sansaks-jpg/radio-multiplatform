import { NextResponse } from "next/server";

const STREAM_ENGINE_API_URL = process.env.STREAM_ENGINE_API_URL || "http://127.0.0.1:8092/config";
export const runtime = "nodejs";

function publicData(data: Record<string, unknown>) {
  return {
    youtube_enabled: data.youtube_enabled === true,
    youtube_key_configured: data.youtube_key_configured === true || Boolean(data.youtube_key),
    vmix_online: typeof data.vmix_online === "boolean" ? data.vmix_online : null,
    youtube_streaming: data.youtube_streaming === true,
    youtube_connecting: data.youtube_connecting === true,
    last_error: typeof data.last_error === "string" ? data.last_error.replace(/rtmps?:\/\/\S+/g, "[YouTube endpoint]") : null,
  };
}

export async function GET() {
  try {
    const res = await fetch(STREAM_ENGINE_API_URL, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error("Engine unavailable");
    return NextResponse.json(publicData(await res.json()), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Gagal terhubung ke Cloud Stream Engine" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON tidak valid." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      typeof body.youtube_enabled !== "boolean" ||
      (body.youtube_key !== undefined && (typeof body.youtube_key !== "string" || !/^[A-Za-z0-9_-]{1,256}$/.test(body.youtube_key.trim())))) {
    return NextResponse.json({ error: "Konfigurasi streaming tidak valid." }, { status: 400 });
  }

  // Validasi: Tolak pengaktifan YouTube jika sinyal studio vMix belum online di server
  if (body.youtube_enabled) {
    try {
      const statusRes = await fetch(STREAM_ENGINE_API_URL, { cache: "no-store", signal: AbortSignal.timeout(4000) });
      if (statusRes.ok) {
        const currentData = await statusRes.json();
        if (currentData.vmix_online !== true) {
          return NextResponse.json(
            { error: "Sinyal video studio (vMix) belum aktif di server. Mulai stream di software vMix terlebih dahulu." },
            { status: 400 }
          );
        }
      }
    } catch {
      // Jika status engine tidak dapat dicek, biarkan POST downstream yang menangani
    }
  }

  try {
    const res = await fetch(STREAM_ENGINE_API_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ youtube_enabled: body.youtube_enabled,
        ...(body.youtube_key !== undefined ? { youtube_key: body.youtube_key.trim() } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error || "Konfigurasi gagal disimpan." }, { status: res.status === 400 ? 400 : 502 });
    return NextResponse.json(publicData(data), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan konfigurasi ke Stream Engine" }, { status: 502 });
  }
}
