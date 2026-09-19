import { cookies } from "next/headers";
import { exchangeAuthorizationCode } from "@/lib/youtube-oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("youtube_oauth_state")?.value;
  cookieStore.delete("youtube_oauth_state");
  if (!expectedState || url.searchParams.get("state") !== expectedState) {
    return Response.json({ error: "State OAuth tidak valid atau kedaluwarsa." }, { status: 400 });
  }
  const code = url.searchParams.get("code");
  if (!code) return Response.json({ error: url.searchParams.get("error") || "Google tidak mengirim kode OAuth." }, { status: 400 });
  try {
    await exchangeAuthorizationCode(code);
    const publicOrigin = process.env.YOUTUBE_OAUTH_REDIRECT_URI
      ? new URL(process.env.YOUTUBE_OAUTH_REDIRECT_URI).origin
      : new URL(request.url).origin;
    return Response.redirect(new URL("/streams?youtube=connected", publicOrigin));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Koneksi YouTube gagal." }, { status: 502 });
  }
}
