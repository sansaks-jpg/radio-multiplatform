import { NextResponse } from "next/server";

const STREAM_ENGINE_API_URL =
  process.env.STREAM_ENGINE_API_URL || "http://127.0.0.1:8092/config";

export async function GET() {
  try {
    const res = await fetch(STREAM_ENGINE_API_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`Stream API status ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json(
      { error: "Gagal terhubung ke Cloud Stream Engine", details: message },
      { status: 502 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(STREAM_ENGINE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        youtube_enabled: Boolean(body.youtube_enabled),
        youtube_key: String(body.youtube_key || "").trim(),
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) throw new Error(`Stream API returned status ${res.status}`);

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json(
      { error: "Gagal menyimpan konfigurasi ke Stream Engine", details: message },
      { status: 502 }
    );
  }
}
