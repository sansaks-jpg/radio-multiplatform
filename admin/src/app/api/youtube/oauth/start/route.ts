import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createAuthorizationUrl, isYouTubeOAuthConfigured } from "@/lib/youtube-oauth";

export async function GET() {
  if (!isYouTubeOAuthConfigured()) return Response.json({ error: "OAuth YouTube belum dikonfigurasi." }, { status: 503 });
  const state = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set("youtube_oauth_state", state, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/youtube/oauth", maxAge: 600,
  });
  return Response.redirect(createAuthorizationUrl(state));
}
