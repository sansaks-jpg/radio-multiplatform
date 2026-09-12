import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
};

export async function servePublicFile(folder: string, fileParts: string[] | string) {
  try {
    const rawParts = Array.isArray(fileParts) ? fileParts : [fileParts];
    const safeParts = rawParts
      .map((p) => path.basename(p))
      .filter((p) => Boolean(p) && p !== "." && p !== "..");

    if (safeParts.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const filename = safeParts.join("/");
    const filePath = path.join(process.cwd(), "public", folder, filename);

    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const buffer = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStat.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
