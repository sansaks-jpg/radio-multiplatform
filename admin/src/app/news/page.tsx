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
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="News Center"
        description="Monitor sync WordPress → Supabase news. Tombol Sync Now memicu edge function (demo: local store)."
        actions={
          <Button onClick={() => void onSync()} disabled={syncing} variant="orange">
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync Now"}
          </Button>
        }
      />

      <div className="mb-6 flex-wrap items-center gap-3 rounded-lg border-border bg-card p-4">
        <Badge tone="success">WordPress REST</Badge>
        <span className="text-sm text-muted-foreground">
          Last sync:{" "}
          <strong className="text-foreground">
            {lastNewsSyncAt
              ? `${formatDateTime(lastNewsSyncAt)} (${formatRelative(lastNewsSyncAt)})`
              : "Belum pernah"}
          </strong>
        </span>
        <a
          href="https://radiogaulfmsmg.com"
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
        >
          radiogaulfmsmg.com
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {news.length === 0 ? (
        <EmptyState
          title="Belum ada berita"
          description="Jalankan Sync Now untuk menarik artikel dari WordPress."
          action={
            <Button size="sm" onClick={() => void onSync()}>
              Sync Now
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {news.map((n) => (
            <Card key={n.id}>
              <CardContent className="flex gap-4 p-4">
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
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
                  <div className="mb-1 flex-wrap items-center gap-2">
                    {n.category ? <Badge tone="brand">{n.category}</Badge> : null}
                    {n.wp_post_id ? (
                      <span className="text-[11px] text-muted-foreground">
                        WP #{n.wp_post_id}
                      </span>
                    ) : null}
                  </div>
                  <p className="font-bold leading-snug tracking-tight">{n.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Publish {formatDateTime(n.published_at)} · synced{" "}
                    {formatRelative(n.synced_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-danger hover:bg-danger/10"
                  onClick={() => {
                    if (confirm("Hapus berita dari cache admin?")) {
                      deleteNews(n.id);
                      toast.push("Berita dihapus", "info");
                    }
                  }}
                  aria-label="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
