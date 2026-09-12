import { NextRequest } from "next/server";
import { servePublicFile } from "@/lib/serve-file";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ file: string[] }> }
) {
  const { file } = await props.params;
  return servePublicFile("uploads", file);
}
