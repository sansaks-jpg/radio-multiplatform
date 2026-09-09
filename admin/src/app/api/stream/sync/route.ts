import { NextResponse } from "next/server";

const AZURE_API_URL = "http://40.81.231.250:8092/config";

export async function GET() {
  try {
    const res = await fetch(AZURE_API_URL, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Azure Stream API" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(AZURE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        youtube_enabled: body.youtube_enabled,
        youtube_key: body.youtube_key,
      }),
    });
    
    if (!res.ok) throw new Error("Azure API returned an error");
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to sync config with Azure Stream Engine" },
      { status: 500 }
    );
  }
}
