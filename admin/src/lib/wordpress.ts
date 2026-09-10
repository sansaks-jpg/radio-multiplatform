import type { NewsItem } from "./types";

export const WP_BASE = "https://radiogaulfmsmg.com";
export const WP_API = `${WP_BASE}/wp-json/wp/v2`;

/** Decode common WP HTML entities in titles. */
export function decodeEntities(s: string): string {
  if (!s) return "";
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
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

/** Strip HTML tags to make clean text excerpts. */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
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

export interface WpPost {
  id: number;
  date: string;
  date_gmt?: string;
  slug?: string;
  link?: string;
  title: { rendered: string };
  content?: { rendered: string };
  excerpt?: { rendered: string };
  categories?: number[];
  _embedded?: {
    "wp:featuredmedia"?: WpMedia[];
    "wp:term"?: WpTerm[][];
  };
}

export interface WpCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

let categoryCache: Map<number, string> | null = null;
let categoryCachePromise: Promise<Map<number, string>> | null = null;

export async function loadCategoryCache(): Promise<Map<number, string>> {
  if (categoryCache) return categoryCache;
  if (categoryCachePromise) return categoryCachePromise;
  categoryCachePromise = (async () => {
    try {
      const res = await fetch(
        `${WP_API}/categories?per_page=100&hide_empty=true`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) return new Map();
      const cats = (await res.json()) as WpCategory[];
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

export function resolveCategory(
  p: WpPost,
  catMap: Map<number, string>,
): string {
  const terms = p._embedded?.["wp:term"]?.flat() ?? [];
  const embedded = terms.find((t) => t.taxonomy === "category")?.name;
  if (embedded) {
    return embedded === "Uncategorized" ? "Info Gaul" : decodeEntities(embedded);
  }
  const firstId = p.categories?.[0];
  if (firstId != null) {
    const name = catMap.get(firstId);
    if (name) return name === "Uncategorized" ? "Info Gaul" : decodeEntities(name);
  }
  return "Info Gaul";
}

export function resolveImage(p: WpPost, preferFull = false): string | null {
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

export function mapWpPostToNewsItem(
  p: WpPost,
  catMap: Map<number, string>,
  opts: { includeContent?: boolean } = {},
): NewsItem {
  const published_at = p.date_gmt
    ? `${p.date_gmt.replace(" ", "T")}Z`
    : new Date(p.date).toISOString();

  return {
    id: `wp-${p.id}`,
    wp_post_id: p.id,
    title: decodeEntities(p.title?.rendered ?? "").trim(),
    content: opts.includeContent ? (p.content?.rendered ?? "") : (p.excerpt?.rendered ?? ""),
    image_url: resolveImage(p, opts.includeContent),
    category: resolveCategory(p, catMap),
    published_at,
    url: p.link ?? `${WP_BASE}/?p=${p.id}`,
    synced_at: new Date().toISOString(),
  };
}

export interface FetchWpNewsOptions {
  page?: number;
  perPage?: number;
  search?: string;
  category?: number | string;
}

export interface FetchWpNewsResult {
  items: NewsItem[];
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
}

export async function fetchWpNews(
  options: FetchWpNewsOptions = {},
): Promise<FetchWpNewsResult> {
  const page = options.page ?? 1;
  const perPage = options.perPage ?? 20;

  const fields = [
    "id",
    "date",
    "date_gmt",
    "title",
    "link",
    "categories",
    "featured_media",
    "excerpt",
    "content",
    "_links",
    "_embedded",
  ].join(",");

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    status: "publish",
    _embed: "1",
    _fields: fields,
  });

  if (options.search && options.search.trim()) {
    params.set("search", options.search.trim());
  }

  if (options.category) {
    params.set("categories", String(options.category));
  }

  const url = `${WP_API}/posts?${params.toString()}`;

  const [res, catMap] = await Promise.all([
    fetch(url, {
      signal: AbortSignal.timeout(10000),
      // In Next.js App Router, cache for 60s
      next: { revalidate: 60 },
    }),
    loadCategoryCache(),
  ]);

  if (!res.ok) {
    if (res.status === 400) {
      return { items: [], total: 0, totalPages: 0, page, perPage };
    }
    throw new Error(`WordPress API returned status ${res.status}`);
  }

  const posts = (await res.json()) as WpPost[];
  const total = Number(res.headers.get("X-WP-Total") ?? posts.length);
  const totalPages = Number(res.headers.get("X-WP-TotalPages") ?? "1");

  const items = posts.map((p) =>
    mapWpPostToNewsItem(p, catMap, { includeContent: true }),
  );

  return {
    items,
    total,
    totalPages,
    page,
    perPage,
  };
}

export async function fetchWpCategories(): Promise<WpCategory[]> {
  try {
    const res = await fetch(
      `${WP_API}/categories?per_page=100&hide_empty=true`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as WpCategory[];
    return data.map((c) => ({
      ...c,
      name: c.name === "Uncategorized" ? "Info Gaul" : decodeEntities(c.name),
    }));
  } catch {
    return [];
  }
}
