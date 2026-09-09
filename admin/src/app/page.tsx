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
  "bg-emerald-100 text-emerald-800 border-emerald-300",
  "bg-blue-100 text-blue-800 border-blue-300",
  "bg-violet-100 text-violet-800 border-violet-300",
  "bg-amber-100 text-amber-800 border-amber-300",
  "bg-rose-100 text-rose-800 border-rose-300",
  "bg-cyan-100 text-cyan-800 border-cyan-300",
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
      {/* ── HEADER HALAMAN ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Overview Studio
            </h1>
            <Badge tone="brand" className="text-[10px] font-bold">
              87.8 FM
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Pusat kendali siaran, jadwal on-air, berita portal, dan data pendengar aktif Gaul FM.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={exportUsers}
            className="gap-1.5 shadow-2xs bg-card hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Export Listeners (.xlsx)</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              resetDemoData();
              toast.push("Data demo berhasil di-reset", "info");
            }}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            title="Reset data demo ke awal"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Demo</span>
          </Button>
        </div>
      </div>

      {/* ── METRIK RINGKASAN (STAT STRIP) ── */}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sedang Siaran"
          value={data.nowPlaying.current_program}
          hint={`Penyiar: ${data.nowPlaying.current_host}`}
          tone="orange"
          icon={<Radio className="h-5 w-5" />}
        />
        <StatCard
          label="Program Minggu Ini"
          value={`${data.programs.length} Acara`}
          hint={`${todayPrograms.length} slot hari ${DAY_NAMES[today]}`}
          tone="brand"
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <StatCard
          label="Berita Tersinkron"
          value={`${data.news.length} Artikel`}
          hint={
            data.lastNewsSyncAt
              ? `Sync ${formatRelative(data.lastNewsSyncAt)}`
              : "Siap sinkronisasi"
          }
          icon={<Newspaper className="h-5 w-5" />}
        />
        <StatCard
          label="Pendengar Terdaftar"
          value={`${data.profiles.length} Akun`}
          hint={
            data.sheetsSyncStatus === "ok"
              ? "Sinkron ke Google Sheets ✓"
              : "Mode lokal / standby"
          }
          tone="live"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      {/* ── HERO ON-AIR + JADWAL HARI INI ── */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* HERO: Live Control Card (lg:col-span-8) */}
        <Card className="lg:col-span-8 border border-orange-200/90 bg-gradient-to-br from-card via-card to-orange-50/35 shadow-xs overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge tone="live" pulse className="px-2 py-0.5 text-[10px]">
                  LIVE ON AIR
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">
                  Update terakhir {formatDateTime(data.nowPlaying.updated_at)}
                </span>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                {data.nowPlaying.current_program}
              </CardTitle>
              <CardDescription className="text-sm font-semibold text-orange mt-0.5">
                Host / Penyiar: {data.nowPlaying.current_host}
              </CardDescription>
            </div>

            <Link href="/now-playing">
              <Button variant="orange" size="sm" className="gap-1.5 shadow-xs shrink-0">
                <Radio className="h-3.5 w-3.5" />
                <span>Ubah On-Air</span>
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="pt-5">
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              {/* Cover Art Program */}
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm flex items-center justify-center">
                {data.nowPlaying.current_cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.nowPlaying.current_cover_url}
                    alt={data.nowPlaying.current_program}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Radio className="h-10 w-10 text-slate-400" />
                )}
              </div>

              {/* Deskripsi & Shortcut Aksi */}
              <div className="flex-1 space-y-3 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Status on-air dan judul program di kartu ini langsung terkirim secara instan ke seluruh aplikasi mobile pendengar.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Link href="/chat">
                    <Button variant="secondary" size="sm" className="gap-1.5 border border-border shadow-2xs">
                      <MessageSquare className="h-3.5 w-3.5 text-brand" />
                      <span>Live Chat Studio</span>
                    </Button>
                  </Link>

                  <Link href="/schedule">
                    <Button variant="secondary" size="sm" className="gap-1.5 border border-border shadow-2xs">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Kelola Jadwal</span>
                    </Button>
                  </Link>

                  <Link href="/news">
                    <Button variant="secondary" size="sm" className="gap-1.5 border border-border shadow-2xs">
                      <Newspaper className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Sync Berita</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* JADWAL HARI INI (lg:col-span-4) */}
        <Card className="lg:col-span-4 border border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">
                Jadwal Siar {DAY_NAMES[today]}
              </CardTitle>
              <CardDescription className="text-xs">
                {todayPrograms.length} segmen siaran hari ini
              </CardDescription>
            </div>
            <Link href="/schedule" className="text-xs font-bold text-brand hover:underline">
              Semua →
            </Link>
          </CardHeader>

          <CardContent className="pt-3.5 space-y-2">
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
                    className={`flex items-center justify-between gap-2.5 rounded-lg px-3 py-2 transition-all border ${
                      isCurrent
                        ? "bg-orange-50/70 border-orange-200/80 shadow-2xs"
                        : "bg-muted/40 border-transparent hover:bg-muted/70"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs sm:text-sm font-bold text-foreground">
                          {p.name}
                        </p>
                        {isCurrent && (
                          <span className="h-1.5 w-1.5 rounded-full bg-orange animate-ping shrink-0" />
                        )}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {p.host}
                      </p>
                    </div>

                    <span className="shrink-0 font-mono text-[11px] font-semibold text-muted-foreground bg-card border border-border/80 px-2 py-0.5 rounded shadow-2xs">
                      {p.start_time}–{p.end_time}
                    </span>
                  </div>
                );
              })
            )}

            <Link
              href="/schedule"
              className="mt-3 flex items-center justify-center gap-1 py-1.5 text-xs font-bold text-brand hover:text-brand/80 transition-colors border-t border-border/60"
            >
              <span>Kelola Jadwal Lengkap 7 Hari</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ── BERITA TERBARU & PENDENGAR BARU ── */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* BERITA TERBARU (lg:col-span-8) */}
        <Card className="lg:col-span-8 border border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3">
            <div>
              <CardTitle className="text-base font-bold">
                Berita & Konten Terbaru
              </CardTitle>
              <CardDescription className="text-xs">
                Artikel tersinkronisasi dari portal radiogaulfmsmg.com
              </CardDescription>
            </div>
            <Link href="/news">
              <Button variant="ghost" size="sm" className="text-xs font-semibold">
                Kelola Berita
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="pt-3.5 space-y-2.5">
            {data.news.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Belum ada berita tersinkron. Klik Sync Berita untuk mengambil artikel WordPress.
              </p>
            ) : (
              data.news.slice(0, 4).map((n) => (
                <div
                  key={n.id}
                  className="flex items-center gap-3.5 rounded-lg p-2.5 transition-all hover:bg-muted/50 border border-transparent hover:border-border/60"
                >
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-border/80 shadow-2xs">
                    {n.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={n.image_url}
                        alt={n.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <Newspaper className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs sm:text-sm font-bold text-foreground hover:text-brand transition-colors">
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                        {n.category ?? "Umum"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        sync {formatRelative(n.synced_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* PENDENGAR BARU (lg:col-span-4) */}
        <Card className="lg:col-span-4 border border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3">
            <div>
              <CardTitle className="text-base font-bold">
                Pendengar Baru
              </CardTitle>
              <CardDescription className="text-xs">
                Pengguna terdaftar aplikasi mobile
              </CardDescription>
            </div>
            <Link href="/users">
              <Button variant="ghost" size="sm" className="text-xs font-semibold">
                Semua
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="pt-3.5 space-y-3">
            {data.profiles.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Belum ada data pendengar.
              </p>
            ) : (
              data.profiles.slice(0, 5).map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-extrabold border shadow-2xs shrink-0 ${getAvatarColor(
                      u.full_name || "User"
                    )}`}
                  >
                    {(u.full_name ?? "?").charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs sm:text-sm font-bold text-foreground">
                      {u.full_name}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {u.city || "Semarang"}
                    </p>
                  </div>

                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60 shrink-0">
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
