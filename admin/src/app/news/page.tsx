"use client";

import { useState } from "react";
import { ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { useAdminStore } from "@/hooks/useAdminStore";
import { deleteNews, syncNewsFromWordPress } from "@/lib/data-store";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, formatRelative } from "@/lib/utils";

export default function NewsPage() {
  const { news, lastNewsSyncAt } = useAdminStore();
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);

  const onSync = async () => {
    setSyncing(true);
    try {
      // Simulate network latency for WP edge function
      await new Promise((r) => setTimeout(r, 700));
      const { added } = syncNewsFromWordPress();
      toast.push(`Sync selesai · +${added} artikel (demo WP pull)`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        title="Portal Berita"
        badge={<Badge tone="brand">WordPress REST</Badge>}
        description="Sinkronisasi dan kelola artikel berita dari portal radiogaulfmsmg.com ke aplikasi mobile pendengar."
        actions={
          <Button onClick={() => void onSync()} disabled={syncing} variant="accent" size="sm">
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Menyinkronkan…" : "Sinkronkan Sekarang"}</span>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2.5">
          <Badge tone="success">Terhubung</Badge>
          <span className="text-sm text-muted-foreground">
            Sinkronisasi terakhir:{" "}
            <strong className="text-foreground">
              {lastNewsSyncAt
                ? `${formatDateTime(lastNewsSyncAt)} (${formatRelative(lastNewsSyncAt)})`
                : "Belum pernah"}
            </strong>
          </span>
        </div>
        <a
          href="https://radiogaulfmsmg.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
        >
          <span>Buka radiogaulfmsmg.com</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {news.length === 0 ? (
        <EmptyState
          title="Belum ada berita"
          description="Jalankan sinkronisasi untuk menarik artikel terbaru dari portal WordPress."
          action={
            <Button size="sm" variant="accent" onClick={() => void onSync()}>
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sinkronkan Sekarang</span>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {news.map((n) => (
            <Card key={n.id}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                  {n.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={n.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {n.category ? <Badge tone="brand">{n.category}</Badge> : null}
                    {n.wp_post_id ? (
                      <span className="text-[11px] text-muted-foreground">
                        ID #{n.wp_post_id}
                      </span>
                    ) : null}
                  </div>
                  <p className="font-semibold leading-snug tracking-tight text-foreground">{n.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tayang {formatDateTime(n.published_at)} · sync{" "}
                    {formatRelative(n.synced_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-danger hover:bg-danger-soft"
                  onClick={() => {
                    if (confirm("Hapus berita dari cache admin?")) {
                      deleteNews(n.id);
                      toast.push("Berita dihapus", "info");
                    }
                  }}
                  aria-label="Hapus berita"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
