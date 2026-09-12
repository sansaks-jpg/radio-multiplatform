import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Tidak ada file yang dipilih untuk diunggah" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Batasi ukuran file (maksimal 10 MB)
    const MAX_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Ukuran file melebihi batas maksimum 10 MB" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Validasi mime-type gambar yang diizinkan
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Tipe file tidak didukung. Harap unggah file gambar (PNG, JPG, WebP, SVG, GIF)" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Validasi folder target yang diizinkan untuk keamanan
    const allowedFolders = ["penyiar", "banners", "programs", "uploads"];
    const targetFolder = allowedFolders.includes(folder) ? folder : "uploads";

    // 4. Sanitasi nama file & ekstensi
    const originalName = file.name || "image.png";
    const ext = (path.extname(originalName) || ".png").toLowerCase();
    const cleanBase = path
      .basename(originalName, ext)
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .slice(0, 30);
    const filename = `${targetFolder}-${cleanBase}-${Date.now()}${ext}`;

    // 5. Simpan file langsung ke direktori public server Next.js
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const publicDir = path.join(process.cwd(), "public", targetFolder);
    await mkdir(publicDir, { recursive: true });

    const filePath = path.join(publicDir, filename);
    await writeFile(filePath, buffer);

    const publicUrl = `/${targetFolder}/${filename}`;

    return NextResponse.json(
      {
        success: true,
        data: {
          url: publicUrl,
          filename,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}
