import { NextResponse } from "next/server";
import {
  getRecentComments,
  getAllCommentsForAdmin,
  addComment,
} from "@/lib/comments-bus";
import { getActiveCommentSession, getServerPrograms } from "@/lib/radio-bus";

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forAdmin = searchParams.get("forAdmin") === "true";
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 50);

    const [comments, programs] = await Promise.all([
      forAdmin ? getAllCommentsForAdmin(limit) : getRecentComments(limit),
      getServerPrograms(),
    ]);

    const session = getActiveCommentSession(programs);

    return NextResponse.json(
      {
        success: true,
        comments,
        session: {
          session_start: session.sessionStartIso,
          program_name: session.programName,
          start_time: session.startTime,
          end_time: session.endTime,
          is_on_air: session.isOnAir,
        },
      },
      {
        headers: {
          ...corsHeaders,
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
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
    const { user_name, message, avatar_seed, is_broadcaster } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Pesan tidak boleh kosong" },
        { status: 400, headers: corsHeaders }
      );
    }

    const userName = (user_name && typeof user_name === "string")
      ? user_name.trim()
      : "Pendengar Gaul";

    const comment = await addComment({
      user_name: userName,
      message: message.trim(),
      avatar_seed: avatar_seed || null,
      is_broadcaster: Boolean(is_broadcaster),
    });

    return NextResponse.json(
      { success: true, comment },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}
