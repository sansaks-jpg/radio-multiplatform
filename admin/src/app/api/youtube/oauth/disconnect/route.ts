import { disconnectYouTubeAccount } from "@/lib/youtube-oauth";

export async function DELETE() {
  try {
    return Response.json(await disconnectYouTubeAccount(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal memutuskan akun YouTube." }, { status: 500 });
  }
}
