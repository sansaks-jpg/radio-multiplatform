import { NextResponse } from "next/server";
import { toggleHighlight, toggleHidden } from "@/lib/comments-bus";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;
    const body = await req.json();
    const { action } = body; // 'toggle_highlight' | 'toggle_hidden'

    if (action === "toggle_highlight") {
      const updated = await toggleHighlight(id);
      if (!updated) {
        return NextResponse.json(
          { error: "Comment not found" },
          { status: 404, headers: corsHeaders }
        );
      }
      return NextResponse.json(
        { success: true, comment: updated },
        { headers: corsHeaders }
      );
    }

    if (action === "toggle_hidden") {
      const updated = await toggleHidden(id);
      if (!updated) {
        return NextResponse.json(
          { error: "Comment not found" },
          { status: 404, headers: corsHeaders }
        );
      }
      return NextResponse.json(
        { success: true, comment: updated },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { error: "Aksi tidak dikenal" },
      { status: 400, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}
