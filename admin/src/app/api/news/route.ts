import { NextRequest, NextResponse } from "next/server";
import { fetchWpCategories, fetchWpNews } from "@/lib/wordpress";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const perPage = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("per_page") ?? "20", 10)),
    );
    const search = searchParams.get("search") ?? undefined;
    const category = searchParams.get("category") ?? undefined;

    const [newsResult, categories] = await Promise.all([
      fetchWpNews({ page, perPage, search, category }),
      fetchWpCategories(),
    ]);

    // Asynchronously upsert to Supabase if client configured
    if (supabase && newsResult.items.length > 0) {
      const dbPayload = newsResult.items.map((item) => ({
        id: item.id,
        wp_post_id: item.wp_post_id,
        title: item.title,
        content: item.content,
        image_url: item.image_url,
        category: item.category,
        published_at: item.published_at,
        synced_at: item.synced_at,
      }));

      supabase
        .from("news")
        .upsert(dbPayload, { onConflict: "wp_post_id" })
        .then(({ error }) => {
          if (error) {
            console.error("[api/news] Supabase upsert error:", error);
          }
        });
    }

    return NextResponse.json(
      {
        success: true,
        items: newsResult.items,
        total: newsResult.total,
        totalPages: newsResult.totalPages,
        page: newsResult.page,
        perPage: newsResult.perPage,
        categories,
        synced_at: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil berita WordPress";
    console.error("[api/news] Error fetching news:", message);

    return NextResponse.json(
      {
        success: false,
        error: message,
        items: [],
        total: 0,
        totalPages: 0,
      },
      { status: 502 },
    );
  }
}
