/**
 * WordPress REST client — radiogaulfmsmg.com (prototype / demo data source).
 * List = lean payload (no HTML body). Detail = full content.
 */

import type { NewsItem } from "../types";

export const WP_BASE = "https://radiogaulfmsmg.com";
export const WP_API = `${WP_BASE}/wp-json/wp/v2`;

const NEWS_PAGE_SIZE = 10;

/** Decode common WP HTML entities in titles. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&#8230;/g, "…")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

interface WpMediaSize {
  source_url?: string;
}

interface WpMedia {
  source_url?: string;
  media_details?: {
    sizes?: {
      medium?: WpMediaSize;
      medium_large?: WpMediaSize;
      large?: WpMediaSize;
      thumbnail?: WpMediaSize;
    };
  };
}

interface WpTerm {
  id: number;
  name: string;
  taxonomy: string;
}

interface WpPost {
  id: number;
  date: string;
  date_gmt?: string;
  slug?: string;
  link?: string;
  title: { rendered: string };
  content?: { rendered: string };
  categories?: number[];
  _embedded?: {
    "wp:featuredmedia"?: WpMedia[];
    "wp:term"?: WpTerm[][];
  };
}

/** Cached category id → name (fallback if embed missing). */
let categoryCache: Map<number, string> | null = null;
let categoryCachePromise: Promise<Map<number, string>> | null = null;

async function loadCategoryCache(): Promise<Map<number, string>> {
  if (categoryCache) return categoryCache;
  if (categoryCachePromise) return categoryCachePromise;
  categoryCachePromise = (async () => {
    try {
      const res = await fetch(
        `${WP_API}/categories?per_page=100&hide_empty=true`,
      );
      if (!res.ok) return new Map();
      const cats = (await res.json()) as Array<{ id: number; name: string }>;
      categoryCache = new Map(cats.map((c) => [c.id, c.name]));
      return categoryCache;
    } catch {
      return new Map();
    } finally {
      categoryCachePromise = null;
    }
  })();
  return categoryCachePromise;
}

function resolveCategory(
  p: WpPost,
  catMap: Map<number, string>,
): string | null {
  // Prefer embedded term names (accurate for multi-cat posts).
  const terms = p._embedded?.["wp:term"]?.flat() ?? [];
  const embedded = terms.find((t) => t.taxonomy === "category")?.name;
  if (embedded) {
    return embedded === "Uncategorized" ? "Info Gaul" : embedded;
  }
  // Fallback: first category id → name map.
  const firstId = p.categories?.[0];
  if (firstId != null) {
    const name = catMap.get(firstId);
    if (name) return name === "Uncategorized" ? "Info Gaul" : name;
  }
  return null;
}

/** Prefer medium_large / medium for list thumbs — lighter decode. */
function resolveImage(p: WpPost, preferFull: boolean): string | null {
  const media = p._embedded?.["wp:featuredmedia"]?.[0];
  if (!media) return null;
  if (preferFull) return media.source_url ?? null;
  const sizes = media.media_details?.sizes;
  return (
    sizes?.medium_large?.source_url ??
    sizes?.large?.source_url ??
    sizes?.medium?.source_url ??
    media.source_url ??
    null
  );
}

function mapPost(
  p: WpPost,
  catMap: Map<number, string>,
  opts: { includeContent: boolean },
): NewsItem {
  const published_at = p.date_gmt
    ? `${p.date_gmt.replace(" ", "T")}Z`
    : new Date(p.date).toISOString();

  return {
    id: `wp-${p.id}`,
    wp_post_id: p.id,
    title: decodeEntities(p.title?.rendered ?? "").trim(),
    content: opts.includeContent ? (p.content?.rendered ?? "") : "",
    image_url: resolveImage(p, opts.includeContent),
    category: resolveCategory(p, catMap),
    published_at,
  };
}

export interface WpNewsPage {
  items: NewsItem[];
  nextPage: number | null;
}

/**
 * Lean list page — no full HTML body (cuts ~70% payload).
 * Categories via embed + category map fallback.
 */
export async function fetchWpNewsPage(pageParam: number): Promise<WpNewsPage> {
  const page = pageParam + 1;
  // _fields must include _links for _embed to hydrate.
  const fields = [
    "id",
    "date",
    "date_gmt",
    "title",
    "categories",
    "featured_media",
    "_links",
    "_embedded",
  ].join(",");
  const url =
    `${WP_API}/posts?per_page=${NEWS_PAGE_SIZE}&page=${page}` +
    `&status=publish&_embed=1&_fields=${fields}`;

  const [res, catMap] = await Promise.all([fetch(url), loadCategoryCache()]);
  if (!res.ok) {
    if (res.status === 400) return { items: [], nextPage: null };
    throw new Error(`[GaulFM] WordPress news ${res.status}`);
  }
  const posts = (await res.json()) as WpPost[];
  const totalPages = Number(res.headers.get("X-WP-TotalPages") ?? "1");
  return {
    items: posts.map((p) => mapPost(p, catMap, { includeContent: false })),
    nextPage: page < totalPages ? pageParam + 1 : null,
  };
}

/** Full single post (body HTML) for article reader. */
export async function fetchWpNewsById(id: string): Promise<NewsItem | null> {
  const numeric = id.startsWith("wp-") ? id.slice(3) : id;
  if (!/^\d+$/.test(numeric)) return null;
  const [res, catMap] = await Promise.all([
    fetch(`${WP_API}/posts/${numeric}?_embed=1`),
    loadCategoryCache(),
  ]);
  if (!res.ok) return null;
  const post = (await res.json()) as WpPost;
  return mapPost(post, catMap, { includeContent: true });
}
