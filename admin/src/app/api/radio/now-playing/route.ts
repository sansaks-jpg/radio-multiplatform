import { NextResponse } from "next/server";
import { getServerNowPlaying, setServerNowPlaying } from "@/lib/radio-bus";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  try {
    const data = await getServerNowPlaying();
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          ...corsHeaders,
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    setServerNowPlaying(body);

    // Sync to Supabase in background if configured
    if (isSupabaseConfigured && supabase) {
      void supabase
        .from("now_playing")
        .upsert({
          id: "00000000-0000-0000-0000-000000000001",
          current_program: body.current_program,
          current_host: body.current_host,
          current_cover_url: body.current_cover_url,
          updated_at: new Date().toISOString(),
        })
        .then(() => {});
    }

    const updated = await getServerNowPlaying();
    return NextResponse.json(
      { success: true, data: updated },
      {
        headers: {
          ...corsHeaders,
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}

