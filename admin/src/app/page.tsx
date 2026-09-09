"use client";

import Link from "next/link";
import {
  CalendarDays,
  Download,
  Newspaper,
  Radio,
  RefreshCw,
  Users,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useToday } from "@/hooks/useToday";
import { StatCard } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DAY_NAMES, formatDateTime, formatRelative } from "@/lib/utils";
import { resetDemoData } from "@/lib/data-store";
import { useToast } from "@/components/ui/toast";

const AVATAR_COLORS = [
  "bg-brand-soft text-brand",
  "bg-accent-soft text-accent",
  "bg-live-soft text-live",
  "bg-warning-soft text-warning",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
    toast.push("Export file Excel pendengar berhasil!");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Overview Studio
            </h1>
            <Badge tone="brand">87.8 FM</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Pusat kendali siaran, jadwal on-air, berita portal, dan data pendengar aktif Gaul FM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportUsers}>
            <Download className="h-3.5 w-3.5" />
            <span>Export Listeners</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              resetDemoData();
              toast.push("Data demo berhasil di-reset", "info");
            }}
            title="Reset data demo ke awal"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Demo</span>
          </Button>
        </div>
      </div>

      {/* ── METRIK RINGKASAN ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sedang siaran"
          value={data.nowPlaying.current_program}
          hint={`Penyiar: ${data.nowPlaying.current_host}`}
          tone="accent"
          icon={<Radio className="h-4.5 w-4.5" />}
        />
        <StatCard
          label="Program minggu ini"
          value={`${data.programs.length} acara`}
          hint={`${todayPrograms.length} slot hari ${DAY_NAMES[today]}`}
          tone="brand"
          icon={<CalendarDays className="h-4.5 w-4.5" />}
        />
        <StatCard
          label="Berita tersinkron"
          value={`${data.news.length} artikel`}
          hint={
            data.lastNewsSyncAt
              ? `Sync ${formatRelative(data.lastNewsSyncAt)}`
              : "Siap disinkronkan"
          }
          icon={<Newspaper className="h-4.5 w-4.5" />}
        />
        <StatCard
          label="Pendengar terdaftar"
          value={`${data.profiles.length} akun`}
          hint={
            data.sheetsSyncStatus === "ok"
              ? "Tersinkron ke Google Sheets"
              : "Mode lokal / standby"
          }
          icon={<Users className="h-4.5 w-4.5" />}
        />
      </div>

      {/* ── ON-AIR + JADWAL HARI INI ── */}
      <div className="grid gap-5 lg:grid-cols-12 items-start">
        <Card className="lg:col-span-8 on-air-glow">
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <Badge tone="live" pulse>
                  Live on air
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Diperbarui {formatDateTime(data.nowPlaying.updated_at)}
                </span>
              </div>
              <CardTitle className="text-lg sm:text-xl">
                {data.nowPlaying.current_program}
              </CardTitle>
              <CardDescription className="mt-0.5 font-medium text-accent">
                Host / Penyiar: {data.nowPlaying.current_host}
              </CardDescription>
            </div>

            <Link href="/now-playing">
              <Button variant="accent" size="sm" className="shrink-0">
                <Radio className="h-3.5 w-3.5" />
                <span>Ubah On-Air</span>
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {data.nowPlaying.current_cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.nowPlaying.current_cover_url}
                    alt={data.nowPlaying.current_program}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Radio className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Status on-air dan judul program di kartu ini langsung terkirim secara instan ke seluruh aplikasi mobile pendengar.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Link href="/chat">
                    <Button variant="secondary" size="sm">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Live Chat Studio</span>
                    </Button>
                  </Link>

                  <Link href="/schedule">
                    <Button variant="secondary" size="sm">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>Kelola Jadwal</span>
                    </Button>
                  </Link>

                  <Link href="/news">
                    <Button variant="secondary" size="sm">
                      <Newspaper className="h-3.5 w-3.5" />
                      <span>Sync Berita</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* JADWAL HARI INI */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3">
            <div>
              <CardTitle>Jadwal {DAY_NAMES[today]}</CardTitle>
              <CardDescription className="text-xs">
                {todayPrograms.length} segmen siaran hari ini
              </CardDescription>
            </div>
            <Link href="/schedule" className="text-xs font-medium text-brand hover:underline">
              Semua
            </Link>
          </CardHeader>

          <CardContent className="space-y-1.5 pt-3">
            {todayPrograms.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Tidak ada program siaran hari ini.
              </p>
            ) : (
              todayPrograms.slice(0, 5).map((p) => {
                const isCurrent = p.name.toLowerCase() === data.nowPlaying.current_program.toLowerCase();
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-2.5 rounded-md px-3 py-2 transition-colors ${
                      isCurrent
                        ? "bg-accent-soft"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-foreground">
                          {p.name}
                        </p>
                        {isCurrent && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.host}
                      </p>
                    </div>

                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {p.start_time}–{p.end_time}
                    </span>
                  </div>
                );
              })
            )}

            <Link
              href="/schedule"
              className="mt-2 flex items-center justify-center gap-1 border-t border-border/60 py-2 text-xs font-medium text-brand transition-colors hover:text-brand/80"
            >
              <span>Kelola jadwal lengkap 7 hari</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ── BERITA TERBARU & PENDENGAR BARU ── */}
      <div className="grid gap-5 lg:grid-cols-12 items-start">
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3">
            <div>
              <CardTitle>Berita & konten terbaru</CardTitle>
              <CardDescription className="text-xs">
                Artikel tersinkronisasi dari portal radiogaulfmsmg.com
              </CardDescription>
            </div>
            <Link href="/news">
              <Button variant="ghost" size="sm">
                Kelola Berita
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="space-y-1 pt-3">
            {data.news.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Belum ada berita tersinkron. Klik Sync Berita untuk mengambil artikel WordPress.
              </p>
            ) : (
              data.news.slice(0, 4).map((n) => (
                <div
                  key={n.id}
                  className="flex items-center gap-3.5 rounded-md p-2 transition-colors hover:bg-muted"
                >
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    {n.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={n.image_url}
                        alt={n.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Newspaper className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {n.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        {n.category ?? "Umum"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        sync {formatRelative(n.synced_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* PENDENGAR BARU */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3">
            <div>
              <CardTitle>Pendengar baru</CardTitle>
              <CardDescription className="text-xs">
                Pengguna terdaftar aplikasi mobile
              </CardDescription>
            </div>
            <Link href="/users">
              <Button variant="ghost" size="sm">
                Semua
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="space-y-1 pt-3">
            {data.profiles.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Belum ada data pendengar.
              </p>
            ) : (
              data.profiles.slice(0, 5).map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-muted">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${getAvatarColor(
                      u.full_name || "User"
                    )}`}
                  >
                    {(u.full_name ?? "?").charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {u.full_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.city || "Semarang"}
                    </p>
                  </div>

                  <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {u.device_os || "Mobile"}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
