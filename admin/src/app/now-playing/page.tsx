"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MessageSquare,
  Mic,
  Radio,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Video,
  Zap,
} from "lucide-react";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useToday } from "@/hooks/useToday";
import { setBroadcasterOnAir, updateNowPlaying } from "@/lib/data-store";
import type { Announcer, Program } from "@/lib/types";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { DAY_NAMES, formatDateTime, formatRelative } from "@/lib/utils";

/** Preset cover gambar resmi studio agar penyiar tidak perlu mengetik URL saat siaran khusus */
const STUDIO_COVER_PRESETS = [
  {
    label: "Studio Live",
    url: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Musik Hits",
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Talkshow & Relai",
    url: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Sore Santai",
    url: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&auto=format&fit=crop&q=80",
  },
];

/** Cek apakah jam saat ini (WIB UTC+7) berada dalam rentang siaran program */
function isSlotCurrentWib(start: string, end: string): boolean {
  try {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const wibDate = new Date(utcMs + 7 * 3600000);
    const curMinutes = wibDate.getHours() * 60 + wibDate.getMinutes();

    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const startMin = (sh || 0) * 60 + (sm || 0);
    let endMin = (eh || 0) * 60 + (em || 0);
    if (endMin <= startMin) endMin += 24 * 60; // siaran melewati tengah malam

    return curMinutes >= startMin && curMinutes < endMin;
  } catch {
    return false;
  }
}

export default function NowPlayingPage() {
  const { nowPlaying, programs, announcers } = useAdminStore();
  const toast = useToast();
  const today = useToday();

  // Tab mode di kolom kiri: "schedule" (pilihan cepat) atau "custom" (siaran manual/khusus)
  const [activeTab, setActiveTab] = useState<"schedule" | "custom">("schedule");

  // State untuk form siaran khusus
  const [customProgram, setCustomProgram] = useState("");
  const [customHost, setCustomHost] = useState("");
  const [customCoverUrl, setCustomCoverUrl] = useState(
    STUDIO_COVER_PRESETS[0].url
  );
  const [savingCustom, setSavingCustom] = useState(false);

  // Filter program siaran hari ini berdasarkan WIB
  const todaySlots = useMemo(() => {
    return programs
      .filter((p) => p.day_of_week === today)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [programs, today]);

  // Cari slot program yang seharusnya aktif jam ini
  const scheduledNowProgram = useMemo(() => {
    return todaySlots.find((p) => isSlotCurrentWib(p.start_time, p.end_time));
  }, [todaySlots]);

  // 1-Klik aktifkan penyiar yang bertugas
  const handleSelectAnnouncer = (announcer: Announcer) => {
    setBroadcasterOnAir(announcer);
    toast.push(`🎙️ ${announcer.name} kini sedang on-air mengudara!`);
  };

  // 1-Klik reset penyiar ke kosong
  const handleResetAnnouncer = () => {
    setBroadcasterOnAir(null);
    toast.push("📻 Penyiar on-air direset (kosong di aplikasi)");
  };

  // Aksi 1-klik aktifkan program dari jadwal
  const handleActivateProgram = (p: Program) => {
    // Pertahankan penyiar on-air yang sudah dipilih (jika ada)
    const isCustomHostActive =
      nowPlaying.current_host &&
      nowPlaying.current_host !== "Gaul FM" &&
      nowPlaying.current_host !== "Gaul Squad";
    const hostToUse = isCustomHostActive
      ? nowPlaying.current_host
      : "";
    const coverToUse = p.cover_url || null;

    updateNowPlaying({
      current_program: p.name,
      current_host: hostToUse,
      current_cover_url: coverToUse,
    });
    toast.push(`⭐ "${p.name}" kini mengudara di aplikasi mobile!`);
  };

  // Aksi 1-klik deteksi otomatis jam sekarang
  const handleApplyCurrentTimeSlot = () => {
    if (!scheduledNowProgram) {
      toast.push(
        "Tidak ditemukan jadwal yang cocok dengan jam saat ini",
        "info"
      );
      return;
    }
    if (
      scheduledNowProgram.name.toLowerCase() ===
      nowPlaying.current_program.toLowerCase()
    ) {
      toast.push(
        `"${scheduledNowProgram.name}" sudah sedang mengudara`,
        "info"
      );
      return;
    }
    handleActivateProgram(scheduledNowProgram);
  };

  // Aksi simpan siaran khusus / manual
  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customProgram.trim()) {
      toast.push("Nama program wajib diisi", "error");
      return;
    }
    setSavingCustom(true);
    try {
      updateNowPlaying({
        current_program: customProgram.trim(),
        current_host: customHost.trim() || "Gaul FM Studio",
        current_cover_url: customCoverUrl.trim() || null,
      });
      toast.push(
        `⭐ Siaran khusus "${customProgram.trim()}" berhasil mengudara!`
      );
      setCustomProgram("");
      setCustomHost("");
    } finally {
      setSavingCustom(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* ── HEADER HALAMAN (OVERVIEW STANDARD) ── */}
      <PageHeader
        title="Now Playing Studio"
        badge={<Badge tone="accent">Studio Master Control</Badge>}
        description="Pusat kendali pergantian siaran on-air studio Gaul FM 87.8 FM secara instan ke seluruh aplikasi mobile pendengar."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/chat">
              <Button variant="outline" size="sm">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Live Chat Studio</span>
              </Button>
            </Link>
            <Link href="/streams">
              <Button variant="outline" size="sm">
                <Video className="h-3.5 w-3.5" />
                <span>Streaming Hub</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── BARIS METRIK RINGKASAN SITUASIONAL ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sedang mengudara"
          value={nowPlaying.current_program}
          hint={`Penyiar: ${nowPlaying.current_host || "Kosong (Belum Dipilih)"}`}
          tone="live"
          icon={<Radio className="h-4.5 w-4.5" />}
        />
        <StatCard
          label="Terakhir diperbarui"
          value={formatRelative(nowPlaying.updated_at)}
          hint={formatDateTime(nowPlaying.updated_at)}
          tone="accent"
          icon={<Clock className="h-4.5 w-4.5" />}
        />
        <StatCard
          label="Jadwal hari ini"
          value={`${todaySlots.length} acara`}
          hint={`Hari ${DAY_NAMES[today]}, Siaran Aktif`}
          tone="brand"
          icon={<CalendarDays className="h-4.5 w-4.5" />}
        />
        <StatCard
          label="Distribusi pendengar"
          value="Realtime Sync"
          hint="Langsung tampil di lockscreen & app"
          tone="default"
          icon={<Smartphone className="h-4.5 w-4.5" />}
        />
      </div>

      {/* ── KONTROL UTAMA & MONITOR ON-AIR ── */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* KOLOM KIRI (7 Kolom): Panel Pergantian Siaran */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card: Penyiar On-Air (Gaul Squad Dynamic 1-Click Picker) */}
          <Card className="border-accent/30 bg-gradient-to-br from-card via-card to-accent-soft/10">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-accent" />
                  <CardTitle className="text-base">
                    Penyiar On-Air Studio
                  </CardTitle>
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Penyiar tidak tetap di satu program. 1-klik foto untuk mengudarakan penyiar yang sedang siaran.
                </CardDescription>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleResetAnnouncer}
                className="shrink-0 text-xs gap-1.5 border-border/80 hover:bg-muted"
                title="Kosongkan penyiar yang bertugas (tanpa host)"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset (Kosongkan)</span>
              </Button>
            </CardHeader>

            <CardContent className="pt-3.5 pb-3.5">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {announcers.map((ann) => {
                  const isOnAir =
                    Boolean(
                      nowPlaying.current_host &&
                      nowPlaying.current_host.toLowerCase().includes(ann.name.toLowerCase())
                    );
                  return (
                    <button
                      key={ann.id}
                      type="button"
                      onClick={() => handleSelectAnnouncer(ann)}
                      className={`group flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all text-center relative ${
                        isOnAir
                          ? "border-accent bg-accent-soft/40 shadow-sm ring-2 ring-accent"
                          : "border-border/70 bg-card hover:border-accent/40 hover:bg-muted/40"
                      }`}
                    >
                      <div className="relative h-12 w-12 sm:h-13 sm:w-13 overflow-hidden rounded-full border border-border bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ann.photo_url}
                          alt={ann.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        {isOnAir && (
                          <span className="absolute bottom-0 inset-x-0 bg-accent text-[9px] font-bold text-accent-foreground py-0.5 text-center leading-none">
                            ON AIR
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-foreground line-clamp-1">
                        {ann.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("schedule")}
              className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold transition-all ${
                activeTab === "schedule"
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>1. Dari Jadwal {DAY_NAMES[today]} (1-Klik)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold transition-all ${
                activeTab === "custom"
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>2. Siaran Khusus / Manual</span>
            </button>
          </div>

          {/* TAB 1: Pilihan Cepat dari Jadwal Hari Ini */}
          {activeTab === "schedule" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <CardTitle className="text-base">
                    Slot Siaran {DAY_NAMES[today]}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pilih program di bawah untuk langsung mengudarakan ke
                    aplikasi pendengar.
                  </CardDescription>
                </div>

                {scheduledNowProgram && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleApplyCurrentTimeSlot}
                    className="border-accent/40 text-accent hover:bg-accent-soft shrink-0"
                    title="Otomatis aktifkan program sesuai jam WIB sekarang"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>Aktifkan Jam Ini</span>
                  </Button>
                )}
              </CardHeader>

              <CardContent className="space-y-2 pt-3">
                {todaySlots.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      Belum ada jadwal siaran hari {DAY_NAMES[today]}.
                    </p>
                    <p className="mt-1">
                      Anda dapat menggunakan tab &quot;Siaran Khusus /
                      Manual&quot; atau tambahkan jadwal di menu Jadwal Siaran.
                    </p>
                  </div>
                ) : (
                  todaySlots.map((p) => {
                    const isCurrent =
                      p.name.toLowerCase() ===
                      nowPlaying.current_program.toLowerCase();
                    const isNow = isSlotCurrentWib(p.start_time, p.end_time);

                    return (
                      <div
                        key={p.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3 transition-all ${
                          isCurrent
                            ? "border-live/40 bg-live-soft/25"
                            : isNow
                            ? "border-accent/40 bg-accent-soft/20"
                            : "border-border/70 bg-card hover:bg-muted/40"
                        }`}
                      >
                        {/* Detail Info Program */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                            {p.cover_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.cover_url}
                                alt={p.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <Radio className="h-5 w-5" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold text-muted-foreground">
                                {p.start_time}–{p.end_time} WIB
                              </span>
                              {isCurrent && (
                                <Badge tone="live" pulse>
                                  Mengudara
                                </Badge>
                              )}
                              {!isCurrent && isNow && (
                                <Badge tone="accent">Jadwal Jam Ini</Badge>
                              )}
                            </div>

                            <p className="truncate text-sm font-bold tracking-tight text-foreground">
                              {p.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              Host: {p.host || "Gaul FM"}
                            </p>
                          </div>
                        </div>

                        {/* Tombol Aksi 1-Klik */}
                        <div className="shrink-0 flex items-center justify-end">
                          {isCurrent ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-live px-3 py-1.5">
                              <span className="h-2 w-2 rounded-full bg-live animate-ping" />
                              Sedang Siaran
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant={isNow ? "accent" : "outline"}
                              onClick={() => handleActivateProgram(p)}
                              className="gap-1.5"
                            >
                              <Radio className="h-3.5 w-3.5" />
                              <span>Siarkan Ini</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 2: Siaran Khusus / Manual (Breaking News, Relai, dsb.) */}
          {activeTab === "custom" && (
            <Card>
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-base">
                  Siaran Khusus & Non-Jadwal
                </CardTitle>
                <CardDescription className="text-xs">
                  Gunakan form ini untuk siaran khusus seperti Siaran Adzan,
                  Breaking News, Live Luar Studio, atau Relai Jaringan.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                <form onSubmit={handleSaveCustom} className="space-y-4">
                  <Field
                    label="Nama program siaran"
                    hint="Contoh: Breaking News Semarang, Siaran Adzan Maghrib, dsb."
                  >
                    <Input
                      value={customProgram}
                      onChange={(e) => setCustomProgram(e.target.value)}
                      placeholder="Masukkan nama program..."
                      required
                    />
                  </Field>

                  <Field
                    label="Host / penyiar on-air"
                    hint="Nama penyiar atau institusi pelaksana"
                  >
                    <Input
                      value={customHost}
                      onChange={(e) => setCustomHost(e.target.value)}
                      placeholder="Contoh: Tim Redaksi Gaul FM"
                    />
                  </Field>

                  {/* Preset Cover Cepat */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Pilih cover studio resmi (1-klik)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {STUDIO_COVER_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setCustomCoverUrl(preset.url)}
                          className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all ${
                            customCoverUrl === preset.url
                              ? "border-accent bg-accent-soft text-accent font-bold"
                              : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Field
                    label="Cover URL (Kustom)"
                    hint="Bisa menggunakan URL gambar sendiri jika ada"
                  >
                    <Input
                      value={customCoverUrl}
                      onChange={(e) => setCustomCoverUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  </Field>

                  <Button
                    type="submit"
                    variant="accent"
                    size="md"
                    disabled={savingCustom}
                    className="w-full"
                  >
                    <Save className="h-4 w-4" />
                    <span>
                      {savingCustom
                        ? "Memperbarui Siaran…"
                        : "Siarkan Program Khusus Ini"}
                    </span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* KOLOM KANAN (5 Kolom): Live Monitor & Pratinjau Mobile */}
        <div className="lg:col-span-5 space-y-4">
          {/* Kartu On-Air Hero Studio (Identik Overview Glow) */}
          <Card className="on-air-glow overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Badge tone="live" pulse>
                  Sedang Mengudara
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Gaul FM 87.8
                </span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                Live Server
              </span>
            </CardHeader>

            <div className="relative aspect-video w-full overflow-hidden bg-muted">
              {nowPlaying.current_cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={nowPlaying.current_cover_url}
                  alt={nowPlaying.current_program}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Radio className="h-10 w-10 text-muted-foreground/60" />
                </div>
              )}

              {/* Overlay Gradient Halus */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                <p className="text-lg font-bold tracking-tight text-white line-clamp-1">
                  {nowPlaying.current_program}
                </p>
                <p className="text-xs font-medium text-accent">
                  Host: {nowPlaying.current_host || "Belum dipilih (Kosong)"}
                </p>
              </div>
            </div>

            <CardContent className="pt-3 pb-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Status Pembaruan:</span>
                <span className="font-semibold text-foreground">
                  {formatRelative(nowPlaying.updated_at)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Waktu Lengkap:</span>
                <span className="font-mono text-[11px]">
                  {formatDateTime(nowPlaying.updated_at)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Mockup Mini Player di Aplikasi Pendengar */}
          <Card>
            <CardHeader className="border-b border-border/60 pb-2.5 pt-3.5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Tampilan di Aplikasi Pendengar
                </CardTitle>
                <span className="text-[11px] text-brand font-semibold">
                  Mobile Preview
                </span>
              </div>
            </CardHeader>

            <CardContent className="pt-3 pb-3">
              {/* Simulasi Kotak Mini Player Mobile */}
              <div className="rounded-lg border border-border bg-muted/40 p-2.5 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-card">
                  {nowPlaying.current_cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={nowPlaying.current_cover_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Radio className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">
                    {nowPlaying.current_program}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {nowPlaying.current_host ? `${nowPlaying.current_host} · ` : ""}87.8 FM
                  </p>
                </div>

                <Badge tone="live" pulse className="shrink-0 text-[10px] px-2">
                  LIVE
                </Badge>
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                💡 Data siaran ini langsung terdistribusi secara otomatis ke
                layar beranda, pemutar mini player, dan notifikasi lockscreen HP
                pendengar.
              </p>
            </CardContent>
          </Card>

          {/* Tautan Navigasi Cepat Studio */}
          <Card>
            <CardHeader className="border-b border-border/60 pb-2.5 pt-3.5">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Navigasi Cepat Siaran
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 pb-3 space-y-1.5">
              <Link
                href="/chat"
                className="flex items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors hover:bg-muted text-foreground"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-brand" />
                  <span>Buka Live Chat Studio</span>
                </div>
                <span className="text-muted-foreground text-[10px]">Interaksi</span>
              </Link>

              <Link
                href="/streams"
                className="flex items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors hover:bg-muted text-foreground"
              >
                <div className="flex items-center gap-2">
                  <Video className="h-3.5 w-3.5 text-accent" />
                  <span>Orkestrator Streaming (vMix)</span>
                </div>
                <span className="text-muted-foreground text-[10px]">Broadcast</span>
              </Link>

              <Link
                href="/schedule"
                className="flex items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors hover:bg-muted text-foreground"
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-brand" />
                  <span>Master Jadwal 7 Hari</span>
                </div>
                <span className="text-muted-foreground text-[10px]">Agenda</span>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
