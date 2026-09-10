"use client";

import { useMemo } from "react";
import { Plus, Pencil, Trash2, Clock, User } from "lucide-react";
import type { Program } from "@/lib/types";
import { DAY_NAMES, DAY_SHORT, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface WeeklyMatrixViewProps {
  programs: Program[];
  today: number;
  onEdit: (program: Program) => void;
  onDelete: (program: Program) => void;
  onAddDay: (day: number) => void;
  searchQuery?: string;
}

// Urutan hari: Senin (1) s/d Minggu (0) agar pas dengan ritme kerja siaran
const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0];

export function WeeklyMatrixView({
  programs,
  today,
  onEdit,
  onDelete,
  onAddDay,
  searchQuery = "",
}: WeeklyMatrixViewProps) {
  const filteredPrograms = useMemo(() => {
    if (!searchQuery.trim()) return programs;
    const q = searchQuery.toLowerCase().trim();
    return programs.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.host.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [programs, searchQuery]);

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="grid min-w-[980px] grid-cols-7 gap-3">
        {ORDERED_DAYS.map((dayIdx) => {
          const isToday = today === dayIdx;
          const dayList = filteredPrograms
            .filter((p) => p.day_of_week === dayIdx)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

          return (
            <div
              key={dayIdx}
              className={cn(
                "flex flex-col rounded-xl border bg-card/60 transition-all",
                isToday
                  ? "border-accent/40 shadow-xs ring-1 ring-accent/20"
                  : "border-border/80",
              )}
            >
              {/* Header Kolom Hari */}
              <div
                className={cn(
                  "flex items-center justify-between border-b px-3 py-2.5 rounded-t-xl",
                  isToday
                    ? "border-accent/30 bg-accent-soft text-foreground"
                    : "border-border/70 bg-muted/40 text-foreground",
                )}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {DAY_SHORT[dayIdx]}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-accent px-1.5 py-0.2 text-[9px] font-bold text-accent-foreground">
                        Hari Ini
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {DAY_NAMES[dayIdx]} · {dayList.length} slot
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onAddDay(dayIdx)}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-brand hover:text-brand-foreground transition cursor-pointer"
                  title={`Tambah program di hari ${DAY_NAMES[dayIdx]}`}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Daftar Slot Program di Hari ini */}
              <div className="flex-1 space-y-2 p-2 min-h-[420px]">
                {dayList.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground">Kosong</p>
                    <button
                      type="button"
                      onClick={() => onAddDay(dayIdx)}
                      className="mt-1 text-[10px] font-medium text-brand hover:underline cursor-pointer"
                    >
                      + Tambah slot
                    </button>
                  </div>
                ) : (
                  dayList.map((p) => (
                    <div
                      key={p.id}
                      className="group relative flex flex-col justify-between rounded-lg border border-border bg-card p-2.5 shadow-2xs hover:border-brand/50 hover:shadow-xs transition"
                    >
                      <div>
                        {/* Waktu Jam */}
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span className="font-mono font-bold text-brand flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {p.start_time}–{p.end_time}
                          </span>
                        </div>

                        {/* Nama Program */}
                        <p className="mt-1 text-xs font-bold leading-tight text-foreground line-clamp-2">
                          {p.name}
                        </p>

                        {/* Host */}
                        <p className="mt-0.5 text-[10px] text-muted-foreground flex items-center gap-1 line-clamp-1">
                          <User className="h-2.5 w-2.5 shrink-0" />
                          {p.host}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-2 flex items-center justify-end gap-1 border-t border-border/40 pt-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(p)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
                          title="Edit slot ini"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(p)}
                          className="rounded p-1 text-muted-foreground hover:bg-danger-soft hover:text-danger transition cursor-pointer"
                          title="Hapus slot ini"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
