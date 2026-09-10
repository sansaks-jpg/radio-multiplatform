"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  Copy,
  LayoutGrid,
  ListFilter,
  Pencil,
  Plus,
  Radio,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useToday } from "@/hooks/useToday";
import { deleteProgram, deleteProgramsBatch } from "@/lib/data-store";
import type { Program } from "@/lib/types";
import { DAY_NAMES, DAY_SHORT, cn } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

// Subkomponen modular
import { ScheduleModal } from "./components/ScheduleModal";
import { CopyScheduleModal } from "./components/CopyScheduleModal";
import { WeeklyMatrixView } from "./components/WeeklyMatrixView";
import { ShowCatalogView } from "./components/ShowCatalogView";

type ViewMode = "daily" | "weekly" | "catalog";

export default function SchedulePage() {
  const { programs } = useAdminStore();
  const toast = useToast();
  const today = useToday();

  // State tampilan & filter (default otomatis ke hari live saat ini setelah refresh)
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const day = selectedDay ?? today;
  const setDay = (d: number) => setSelectedDay(d);
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [searchQuery, setSearchQuery] = useState("");

  // State modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<Program | null>(null);

  // Jumlah program unik di studio
  const uniqueShowsCount = useMemo(() => {
    const set = new Set(programs.map((p) => p.name.trim().toLowerCase()));
    return set.size;
  }, [programs]);

  // Program untuk hari yang dipilih pada mode Agenda Harian
  const dayPrograms = useMemo(() => {
    let list = programs.filter((p) => p.day_of_week === day);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.host.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [programs, day, searchQuery]);

  // Handler Buka Tambah Baru
  const handleOpenCreate = (targetDay?: number) => {
    if (targetDay !== undefined) {
      setDay(targetDay);
    }
    setProgramToEdit(null);
    setScheduleModalOpen(true);
  };

  // Handler Buka Edit
  const handleOpenEdit = (prog: Program) => {
    setProgramToEdit(prog);
    setScheduleModalOpen(true);
  };

  // Handler Hapus 1 Slot
  const handleDeleteSlot = (prog: Program) => {
    if (
      !confirm(
        `Hapus slot "${prog.name}" di hari ${DAY_NAMES[prog.day_of_week]} (${prog.start_time}–${prog.end_time})?`,
      )
    ) {
      return;
    }
    deleteProgram(prog.id);
    toast.push("Slot program berhasil dihapus", "info");
  };

  // Handler Hapus Semua Slot Acara (dari Catalog View)
  const handleDeleteAllShowSlots = (showName: string, slotIds: string[]) => {
    if (
      !confirm(
        `Hapus program "${showName}" dari seluruh jadwal siaran (${slotIds.length} hari tayang)? Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }
    deleteProgramsBatch(slotIds);
    toast.push(
      `Semua slot program "${showName}" (${slotIds.length} hari) berhasil dihapus`,
      "info",
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header Halaman */}
      <PageHeader
        title="Jadwal Siaran Mingguan"
        badge={
          <div className="flex items-center gap-1.5">
            <Badge tone="brand">{programs.length} Slot Siaran</Badge>
            <Badge tone="muted">{uniqueShowsCount} Acara Unik</Badge>
          </div>
        }
        description="Kelola jadwal siaran 7 hari studio Gaul FM Semarang. Terhubung langsung ke mobile app pendengar secara real-time."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCopyModalOpen(true)}
              className="border-border hover:bg-muted"
            >
              <Copy className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <span>Salin Jadwal...</span>
            </Button>
            <Button size="sm" onClick={() => handleOpenCreate()}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              <span>Tambah Program</span>
            </Button>
          </div>
        }
      />

      {/* Toolbar: View Switcher & Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
        {/* Switcher 3 Mode Tampilan */}
        <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5 select-none">
          <button
            type="button"
            onClick={() => setViewMode("daily")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
              viewMode === "daily"
                ? "bg-card text-foreground shadow-2xs border border-border/80"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Agenda Harian</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("weekly")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
              viewMode === "weekly"
                ? "bg-card text-foreground shadow-2xs border border-border/80"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Matriks Mingguan</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("catalog")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
              viewMode === "catalog"
                ? "bg-card text-foreground shadow-2xs border border-border/80"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Katalog Acara</span>
          </button>
        </div>

        {/* Input Pencarian Acara */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari acara atau penyiar..."
            className="w-full rounded-md border border-border bg-card pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* MODE 1: AGENDA HARIAN (DAILY VIEW) */}
      {viewMode === "daily" && (
        <div className="space-y-5">
          {/* Day Pills Selector */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {[1, 2, 3, 4, 5, 6, 0].map((i) => {
              const count = programs.filter((p) => p.day_of_week === i).length;
              const active = day === i;
              const isToday = today === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDay(i)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition cursor-pointer",
                    active
                      ? "border-brand bg-brand text-brand-foreground shadow-xs ring-2 ring-brand/20"
                      : isToday
                        ? "border-accent/50 bg-accent-soft text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider">
                    {DAY_SHORT[i]}
                    {isToday && !active ? (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] mt-0.5",
                      active
                        ? "text-brand-foreground/80 font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {count} slot
                  </span>
                </button>
              );
            })}
          </div>

          {/* Subheader Hari Terpilih & Action */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                Agenda {DAY_NAMES[day]}
                {today === day && (
                  <Badge tone="accent" className="text-[10px]">
                    Hari Ini (Live)
                  </Badge>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {dayPrograms.length} program siaran terjadwal untuk hari {DAY_NAMES[day]}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {day !== today && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDay(null)}
                  className="text-xs text-accent hover:bg-accent/10"
                  title="Kembali ke agenda hari siaran live hari ini"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Ke Hari Ini ({DAY_SHORT[today]})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCopyModalOpen(true)}
                className="text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Salin ke Hari Lain
              </Button>
              <Button size="sm" onClick={() => handleOpenCreate(day)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah di {DAY_SHORT[day]}
              </Button>
            </div>
          </div>

          {/* List Card Program */}
          {dayPrograms.length === 0 ? (
            <EmptyState
              title={`Belum ada jadwal di hari ${DAY_NAMES[day]}`}
              description={
                searchQuery
                  ? "Tidak ada program yang cocok dengan pencarian."
                  : "Tambahkan slot siaran baru atau salin dari hari lain."
              }
              action={
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCopyModalOpen(true)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Salin dari Hari Lain
                  </Button>
                  <Button size="sm" onClick={() => handleOpenCreate(day)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Tambah Program
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="space-y-3">
              {dayPrograms.map((p) => {
                // Cari hari-hari lain di mana program ini juga tayang
                const otherDays = programs
                  .filter(
                    (other) =>
                      other.name.trim().toLowerCase() ===
                        p.name.trim().toLowerCase() &&
                      other.day_of_week !== p.day_of_week,
                  )
                  .map((other) => other.day_of_week)
                  .sort((a, b) => a - b);

                return (
                  <Card
                    key={p.id}
                    className="overflow-hidden border-border hover:border-brand/40 transition shadow-2xs"
                  >
                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                      {/* Thumbnail Cover */}
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted border border-border">
                        {p.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.cover_url}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Radio className="h-6 w-6 opacity-30" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-base tracking-tight text-foreground">
                            {p.name}
                          </h3>
                          <Badge tone="brand" className="font-mono text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {p.start_time}–{p.end_time}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground font-medium">
                          Penyiar / Host · <span className="text-foreground">{p.host}</span>
                        </p>

                        {/* Indikator Hari Lain */}
                        {otherDays.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[11px] text-muted-foreground">
                            <span>Tayang juga di:</span>
                            {otherDays.map((od) => (
                              <span
                                key={od}
                                className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-semibold text-foreground"
                              >
                                {DAY_SHORT[od]}
                              </span>
                            ))}
                          </div>
                        )}

                        {p.description ? (
                          <p className="line-clamp-1 text-xs text-muted-foreground pt-0.5">
                            {p.description}
                          </p>
                        ) : null}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(p)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSlot(p)}
                          className="text-danger hover:bg-danger-soft"
                          title="Hapus slot ini"
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
      )}

      {/* MODE 2: MATRIKS MINGGUAN (WEEKLY GRID) */}
      {viewMode === "weekly" && (
        <WeeklyMatrixView
          programs={programs}
          today={today}
          onEdit={handleOpenEdit}
          onDelete={handleDeleteSlot}
          onAddDay={(d) => handleOpenCreate(d)}
          searchQuery={searchQuery}
        />
      )}

      {/* MODE 3: KATALOG ACARA (SHOW CATALOG VIEW) */}
      {viewMode === "catalog" && (
        <ShowCatalogView
          programs={programs}
          onEditShow={handleOpenEdit}
          onDeleteAllSlots={handleDeleteAllShowSlots}
          searchQuery={searchQuery}
        />
      )}

      {/* MODAL TAMBAH / EDIT PROGRAM */}
      <ScheduleModal
        open={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setProgramToEdit(null);
        }}
        programToEdit={programToEdit}
        allPrograms={programs}
        defaultDay={day}
        onSuccessToast={(msg) => toast.push(msg, "info")}
      />

      {/* MODAL SALIN JADWAL ANTAR HARI */}
      <CopyScheduleModal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        programs={programs}
        defaultSourceDay={day}
      />
    </div>
  );
}
