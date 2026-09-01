// =============================================================================
// Gaul FM Semarang — Supabase Edge Function: sync-wp-news
// File: supabase/functions/sync-wp-news/index.ts
// Description: Scheduled cron / webhook function to sync WordPress posts to Supabase.
// =============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const WP_API_URL =
  Deno.env.get("WP_API_URL") ?? "https://radiogaulfmsmg.com/wp-json/wp/v2/posts?_embed=1&per_page=20";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase service credentials missing in Edge environment." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch posts from WordPress REST API
    const wpResponse = await fetch(WP_API_URL);
    if (!wpResponse.ok) {
      throw new Error(`WordPress API returned status ${wpResponse.status}`);
    }

    const posts = await wpResponse.json();
    let syncedCount = 0;

    for (const post of posts) {
      const wpPostId = post.id;
      const title = post.title?.rendered?.replace(/&#(\d+);/g, (_: string, n: string) => String.fromCharCode(Number(n))) ?? "";
      const content = post.content?.rendered ?? "";
      const publishedAt = post.date_gmt ? `${post.date_gmt}Z` : new Date(post.date).toISOString();

      // Extract image URL from embedded media
      const media = post._embedded?.["wp:featuredmedia"]?.[0];
      const imageUrl =
        media?.media_details?.sizes?.medium_large?.source_url ??
        media?.media_details?.sizes?.large?.source_url ??
        media?.source_url ??
        null;

      // Extract category from embedded terms
      const terms = post._embedded?.["wp:term"]?.flat() ?? [];
      const categoryTerm = terms.find((t: any) => t.taxonomy === "category")?.name;
      const category = categoryTerm && categoryTerm !== "Uncategorized" ? categoryTerm : "Info Gaul";

      // 2. Upsert into Supabase news table
      const { error } = await supabase.from("news").upsert(
        {
          id: `wp-${wpPostId}`,
          wp_post_id: wpPostId,
          title: title.trim(),
          content,
          image_url: imageUrl,
          category,
          published_at: publishedAt,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "wp_post_id" }
      );

      if (!error) syncedCount++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${syncedCount} of ${posts.length} articles successfully.`,
        synced_at: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error?.message ?? String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
