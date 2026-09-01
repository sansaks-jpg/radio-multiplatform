"use client";

import Link from "next/link";
import {
  CalendarDays,
  Download,
  Newspaper,
  Radio,
  RefreshCw,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useToday } from "@/hooks/useToday";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DAY_NAMES, formatDateTime, formatRelative } from "@/lib/utils";
import { resetDemoData } from "@/lib/data-store";
import { useToast } from "@/components/ui/toast";

export default function OverviewPage() {
  const data = useAdminStore();
  const toast = useToast();
  const today = useToday();
  const todayPrograms = data.programs
    .filter((p) => p.day_of_week === today)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const exportUsers = () => {
    const rows = data.profiles.map((u) => ({
      full_name: u.full_name,
      email: u.email,
      whatsapp: u.whatsapp,
      device_os: u.device_os,
      device_model: u.device_model,
      city: u.city,
      latitude: u.latitude,
      longitude: u.longitude,
      last_login: u.last_login,
      created_at: u.created_at,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Listeners");
    XLSX.writeFile(wb, "gaulfm_listeners.xlsx");
    toast.push("Export Excel berhasil");
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Overview"
        description="Ringkasan studio Gaul FM — kelola siaran, jadwal, berita, dan data pendengar."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportUsers}>
              <Download className="h-3.5 w-3.5" />
              Export listeners
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetDemoData();
                toast.push("Demo data di-reset", "info");
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset demo
            </Button>
          </>
        }
      />

      {/* Stats strip */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Now playing"
          value={data.nowPlaying.current_program}
          hint={data.nowPlaying.current_host}
          tone="orange"
          icon={<Radio className="h-5 w-5" />}
        />
        <StatCard
          label="Program minggu ini"
          value={data.programs.length}
          hint={`${todayPrograms.length} slot hari ${DAY_NAMES[today]}`}
          tone="brand"
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <StatCard
          label="Berita tersinkron"
          value={data.news.length}
          hint={
            data.lastNewsSyncAt
              ? `Sync ${formatRelative(data.lastNewsSyncAt)}`
              : "Belum sync"
          }
          icon={<Newspaper className="h-5 w-5" />}
        />
        <StatCard
          label="Pendengar terdaftar"
          value={data.profiles.length}
          hint={
            data.sheetsSyncStatus === "ok"
              ? "Google Sheets · OK"
              : "Sheets idle"
          }
          tone="live"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      {/* Live console + schedule */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Live control card — on-air hero */}
        <Card className="on-air-glow card-gradient overflow-hidden lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge tone="live" pulse>
                  Live control
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Updated {formatDateTime(data.nowPlaying.updated_at)}
                </span>
              </div>
              <CardTitle className="text-xl font-extrabold tracking-tight">
                {data.nowPlaying.current_program}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Host · {data.nowPlaying.current_host}
              </p>
            </div>
            <Link href="/now-playing">
              <Button variant="orange" size="sm">
                Ubah on-air
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                {data.nowPlaying.current_cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.nowPlaying.current_cover_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <p className="text-sm text-muted-foreground">
                  Perubahan di sini langsung terlihat di app mobile saat backend
                  terhubung. Mode demo menyimpan ke localStorage.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/schedule">
                    <Button variant="outline" size="sm">
                      Kelola jadwal
                    </Button>
                  </Link>
                  <Link href="/news">
                    <Button variant="outline" size="sm">
                      Sync berita
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Jadwal {DAY_NAMES[today]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayPrograms.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada program.</p>
            ) : (
              todayPrograms.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.host}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {p.start_time}–{p.end_time}
                  </span>
                </div>
              ))
            )}
            <Link
              href="/schedule"
              className="mt-2 block text-center text-xs font-bold text-brand hover:underline"
            >
              Lihat semua jadwal →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* News + listeners */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent news */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Berita terbaru</CardTitle>
            <Link href="/news">
              <Button variant="ghost" size="sm">
                Kelola
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.news.slice(0, 4).map((n) => (
              <div
                key={n.id}
                className="flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted/40"
              >
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  {n.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={n.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.category ?? "Umum"} · sync {formatRelative(n.synced_at)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick listeners */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Pendengar baru</CardTitle>
            <Link href="/users">
              <Button variant="ghost" size="sm">
                Semua
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.profiles.slice(0, 5).map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/15 text-xs font-extrabold text-brand">
                  {(u.full_name ?? "?").charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {u.full_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.city ?? "—"} · {u.device_os}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
