"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Globe,
  Newspaper,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useAdminStore } from "@/hooks/useAdminStore";
import { deleteNews, setNewsItems, syncNewsFromWordPress } from "@/lib/data-store";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, formatRelative } from "@/lib/utils";
import { stripHtml } from "@/lib/wordpress";

export default function NewsPage() {
  const { news: storeNews, lastNewsSyncAt } = useAdminStore();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [totalWpPosts, setTotalWpPosts] = useState<number | null>(null);

  // Auto-fetch real WordPress posts on initial page mount
  useEffect(() => {
    let isMounted = true;

    async function loadNews() {
      try {
        setLoading(true);
        const res = await fetch("/api/news?per_page=30");
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();

        if (isMounted && data.success && Array.isArray(data.items)) {
          setNewsItems(data.items, data.synced_at);
          if (typeof data.total === "number") {
            setTotalWpPosts(data.total);
          }
        }
      } catch (err) {
        console.error("[NewsPage] Gagal memuat berita dari API WordPress:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadNews();

    return () => {
      isMounted = false;
    };
  }, []);

  const onSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/news?per_page=30&refresh=1");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setNewsItems(data.items, data.synced_at);
          if (typeof data.total === "number") {
            setTotalWpPosts(data.total);
          }
          toast.push(`Berhasil sinkron ${data.items.length} artikel dari WordPress`, "success");
          return;
        }
      }

      // Fallback via data-store
      const { added } = await syncNewsFromWordPress();
      toast.push(`Sync selesai · +${added} artikel dari WordPress`, "success");
    } catch {
      toast.push("Gagal menyinkronkan berita WordPress", "error");
    } finally {
      setSyncing(false);
    }
  };

  // Extract unique categories from loaded articles
  const categories = useMemo(() => {
    const cats = new Set<string>();
    storeNews.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [storeNews]);

  // Filter articles by category and search query
  const filteredNews = useMemo(() => {
    return storeNews.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(q);
      const contentMatch = stripHtml(item.content).toLowerCase().includes(q);
      const catMatch = item.category?.toLowerCase().includes(q);

      return titleMatch || contentMatch || Boolean(catMatch);
    });
  }, [storeNews, selectedCategory, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* ── HEADER ── */}
      <PageHeader
        title="Portal Berita"
        badge={<Badge tone="brand">WordPress REST API</Badge>}
        description="Artikel siaran langsung dan kabar terkini otomatis disinkronkan dari radiogaulfmsmg.com sesuai dengan aplikasi mobile pendengar."
        actions={
          <div className="flex items-center gap-2">
            <a
              href="https://radiogaulfmsmg.com"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm">
                <Globe className="h-3.5 w-3.5" />
                <span>radiogaulfmsmg.com</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Button>
            </a>

            <Button
              onClick={() => void onSync()}
              disabled={syncing || loading}
              variant="accent"
              size="sm"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
              />
              <span>{syncing ? "Menyinkronkan…" : "Sinkronkan Sekarang"}</span>
            </Button>
          </div>
        }
      />

      {/* ── STATUS BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm font-semibold text-foreground">
              Terhubung ke WordPress
            </span>
          </div>

          <span className="text-muted-foreground">·</span>

          <span className="text-xs text-muted-foreground">
            Total di Web:{" "}
            <strong className="text-foreground">
              {totalWpPosts != null ? `${totalWpPosts} artikel` : "50+ artikel"}
            </strong>
          </span>

          <span className="text-muted-foreground">·</span>

          <span className="text-xs text-muted-foreground">
            Sinkronisasi terakhir:{" "}
            <strong className="text-foreground">
              {lastNewsSyncAt
                ? `${formatDateTime(lastNewsSyncAt)} (${formatRelative(lastNewsSyncAt)})`
                : "Baru saja"}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-brand font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Sesuai Feed Mobile App</span>
        </div>
      </div>

      {/* ── FILTER & SEARCH ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari judul atau isi berita…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === "all"
                ? "bg-brand text-brand-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
          >
            Semua ({storeNews.length})
          </button>
          {categories.map((cat) => {
            const count = storeNews.filter((i) => i.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT ── */}
      {loading && storeNews.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="flex flex-col sm:flex-row gap-4 p-4">
                <div className="h-24 w-36 shrink-0 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-5 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredNews.length === 0 ? (
        <EmptyState
          title={searchQuery ? "Tidak ada berita yang cocok" : "Belum ada berita tersimpan"}
          description={
            searchQuery
              ? `Tidak ditemukan artikel dengan kata kunci "${searchQuery}".`
              : "Klik tombol sinkronisasi untuk menarik artikel berita langsung dari portal radiogaulfmsmg.com."
          }
          action={
            searchQuery ? (
              <Button size="sm" variant="outline" onClick={() => setSearchQuery("")}>
                Reset Pencarian
              </Button>
            ) : (
              <Button size="sm" variant="accent" onClick={() => void onSync()}>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Sinkronkan Sekarang</span>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredNews.map((n) => {
            const cleanExcerpt = stripHtml(n.content).slice(0, 140);
            return (
              <Card
                key={n.id}
                className="overflow-hidden transition-all hover:border-brand/40 hover:shadow-md"
              >
                <CardContent className="flex flex-col sm:flex-row sm:items-start gap-4 p-4">
                  {/* Thumbnail Image */}
                  <div className="relative h-28 w-full sm:w-44 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    {n.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={n.image_url}
                        alt={n.title}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
                        <Newspaper className="h-7 w-7 opacity-40" />
                        <span className="mt-1 text-[11px] opacity-60">
                          Tanpa Gambar
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Article Details */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      {n.category ? (
                        <Badge tone="brand">{n.category}</Badge>
                      ) : null}
                      {n.wp_post_id ? (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          ID #{n.wp_post_id}
                        </span>
                      ) : null}
                      <span className="text-[11px] text-muted-foreground">
                        Tayang: {formatDateTime(n.published_at)} ({formatRelative(n.published_at)})
                      </span>
                    </div>

                    <h3 className="text-base font-bold leading-snug tracking-tight text-foreground hover:text-brand transition-colors">
                      {n.title}
                    </h3>

                    {cleanExcerpt ? (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {cleanExcerpt}…
                      </p>
                    ) : null}

                    {/* Action Bar */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {n.url ? (
                        <a
                          href={n.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                        >
                          <span>Buka Artikel Asli</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}

                      <span className="text-xs text-muted-foreground/60">·</span>

                      <span className="text-[11px] text-muted-foreground">
                        Disinkronkan: {formatRelative(n.synced_at)}
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex sm:flex-col items-center gap-1 sm:self-start">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-danger hover:bg-danger-soft h-8 w-8 p-0"
                      onClick={() => {
                        if (confirm(`Hapus artikel "${n.title}" dari cache admin?`)) {
                          deleteNews(n.id);
                          toast.push("Berita dihapus dari cache", "info");
                        }
                      }}
                      title="Hapus dari cache tampilan admin"
                      aria-label="Hapus berita"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
