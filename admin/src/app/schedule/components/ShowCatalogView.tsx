"use client";

import { useMemo } from "react";
import { Clock, User, Pencil, Trash2, Calendar, Sparkles } from "lucide-react";
import type { Program } from "@/lib/types";
import { DAY_NAMES, DAY_SHORT, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ShowCatalogViewProps {
  programs: Program[];
  onEditShow: (representativeProgram: Program) => void;
  onDeleteAllSlots: (showName: string, slotIds: string[]) => void;
  searchQuery?: string;
}

interface GroupedShow {
  name: string;
  host: string;
  coverUrl: string | null;
  description: string;
  slots: Program[];
  days: number[];
  timeLabel: string;
  representative: Program;
}

export function ShowCatalogView({
  programs,
  onEditShow,
  onDeleteAllSlots,
  searchQuery = "",
}: ShowCatalogViewProps) {
  const groupedShows = useMemo(() => {
    const map = new Map<string, Program[]>();
    for (const p of programs) {
      const key = p.name.trim().toLowerCase();
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }

    const result: GroupedShow[] = [];
    for (const [, slots] of map) {
      const sorted = [...slots].sort((a, b) =>
        a.day_of_week !== b.day_of_week
          ? a.day_of_week - b.day_of_week
          : a.start_time.localeCompare(b.start_time),
      );
      const rep = sorted[0];
      const days = [...new Set(sorted.map((s) => s.day_of_week))].sort(
        (a, b) => a - b,
      );

      const timeSet = new Set(
        sorted.map((s) => `${s.start_time}–${s.end_time}`),
      );
      const timeLabel =
        timeSet.size === 1
          ? `${rep.start_time}–${rep.end_time}`
          : "Jam Bervariasi";

      result.push({
        name: rep.name,
        host: rep.host,
        coverUrl: rep.cover_url,
        description: rep.description,
        slots: sorted,
        days,
        timeLabel,
        representative: rep,
      });
    }

    // Urutkan berdasarkan frekuensi slot terbanyak, lalu nama
    return result.sort((a, b) => {
      if (b.slots.length !== a.slots.length) {
        return b.slots.length - a.slots.length;
      }
      return a.name.localeCompare(b.name);
    });
  }, [programs]);

  const filteredShows = useMemo(() => {
    if (!searchQuery.trim()) return groupedShows;
    const q = searchQuery.toLowerCase().trim();
    return groupedShows.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.host.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [groupedShows, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Menampilkan <strong className="text-foreground">{filteredShows.length}</strong> program acara unik di studio
        </span>
        <span>
          Kelola jam tayang & sinkronkan hari siaran dalam 1 kali edit
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredShows.map((show) => (
          <Card
            key={show.name}
            className="flex flex-col justify-between border-border hover:border-brand/50 transition shadow-xs"
          >
            <CardContent className="p-4 space-y-3">
              {/* Header Card: Cover & Info */}
              <div className="flex gap-3 items-start">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted border border-border">
                  {show.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={show.coverUrl}
                      alt={show.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Sparkles className="h-6 w-6 opacity-30" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {show.name}
                    </h3>
                  </div>

                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <User className="h-3 w-3 shrink-0" />
                    Host · {show.host}
                  </p>

                  <div className="mt-1 flex items-center gap-1 text-xs font-mono font-bold text-brand">
                    <Clock className="h-3 w-3 shrink-0" />
                    {show.timeLabel}
                  </div>
                </div>
              </div>

              {/* Day Pills Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Hari Siaran:
                  </span>
                  <Badge tone="brand">
                    {show.slots.length} hari / minggu
                  </Badge>
                </div>

                {/* 7 Day Pills */}
                <div className="grid grid-cols-7 gap-1">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                    const isActive = show.days.includes(d);
                    return (
                      <div
                        key={d}
                        className={cn(
                          "rounded py-1 text-center text-[10px] font-semibold transition select-none",
                          isActive
                            ? "bg-brand text-brand-foreground shadow-2xs font-bold"
                            : "bg-muted/50 text-muted-foreground/40",
                        )}
                        title={isActive ? `Aktif di ${DAY_NAMES[d]}` : `Tidak aktif di ${DAY_NAMES[d]}`}
                      >
                        {DAY_SHORT[d]}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Description preview */}
              {show.description ? (
                <p className="text-xs text-muted-foreground line-clamp-2 pt-1 border-t border-border/40">
                  {show.description}
                </p>
              ) : null}
            </CardContent>

            {/* Card Footer Actions */}
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditShow(show.representative)}
                className="text-xs"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit Acara & Hari
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onDeleteAllSlots(
                    show.name,
                    show.slots.map((s) => s.id),
                  )
                }
                className="text-xs text-danger hover:bg-danger-soft"
                title="Hapus semua slot acara ini"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
