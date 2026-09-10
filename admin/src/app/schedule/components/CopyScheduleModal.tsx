"use client";

import { useState } from "react";
import { Copy, AlertTriangle, ArrowRight, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { copyDaySchedule } from "@/lib/data-store";
import type { Program } from "@/lib/types";
import { DAY_NAMES, DAY_SHORT, cn } from "@/lib/utils";

interface CopyScheduleModalProps {
  open: boolean;
  onClose: () => void;
  programs: Program[];
  defaultSourceDay: number;
}

export function CopyScheduleModal({
  open,
  onClose,
  programs,
  defaultSourceDay,
}: CopyScheduleModalProps) {
  const toast = useToast();
  const [sourceDay, setSourceDay] = useState(defaultSourceDay);
  const [targetDays, setTargetDays] = useState<number[]>([]);
  const [overwrite, setOverwrite] = useState(true);

  const sourcePrograms = programs
    .filter((p) => p.day_of_week === sourceDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const toggleTargetDay = (day: number) => {
    if (day === sourceDay) return;
    if (targetDays.includes(day)) {
      setTargetDays(targetDays.filter((d) => d !== day));
    } else {
      setTargetDays([...targetDays, day].sort((a, b) => a - b));
    }
  };

  const selectWeekdayTargets = () => {
    setTargetDays([1, 2, 3, 4, 5].filter((d) => d !== sourceDay));
  };

  const selectAllTargets = () => {
    setTargetDays([0, 1, 2, 3, 4, 5, 6].filter((d) => d !== sourceDay));
  };

  const onExecuteCopy = () => {
    if (sourcePrograms.length === 0) {
      toast.push("Tidak ada program di hari sumber untuk disalin", "error");
      return;
    }
    if (targetDays.length === 0) {
      toast.push("Pilih minimal satu hari tujuan", "error");
      return;
    }

    const { addedCount, replacedCount } = copyDaySchedule(
      sourceDay,
      targetDays,
      overwrite,
    );

    toast.push(
      `Berhasil menyalin ${sourcePrograms.length} program ke ${targetDays.length} hari (${addedCount} slot dibuat${
        replacedCount > 0 ? `, ${replacedCount} digantikan` : ""
      })`,
      "info",
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Salin Jadwal Siaran Antar Hari"
      description="Duplikasi seluruh susunan program siaran dari satu hari ke hari-hari lain dalam satu klik."
      wide
    >
      <div className="space-y-5">
        {/* Sumber Hari */}
        <div className="rounded-lg border border-border bg-card/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              1. Pilih Hari Sumber (Data yang akan disalin)
            </span>
            <Badge tone="brand">{sourcePrograms.length} program</Badge>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_SHORT.map((sName, idx) => {
              const count = programs.filter((p) => p.day_of_week === idx).length;
              const isSource = sourceDay === idx;
              return (
                <button
                  key={sName}
                  type="button"
                  onClick={() => {
                    setSourceDay(idx);
                    setTargetDays((prev) => prev.filter((d) => d !== idx));
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border py-2 text-center transition cursor-pointer",
                    isSource
                      ? "border-brand bg-brand text-brand-foreground font-bold shadow-xs ring-2 ring-brand/30"
                      : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="text-xs">{sName}</span>
                  <span className="text-[10px] opacity-80">{count} slot</span>
                </button>
              );
            })}
          </div>

          {/* Source program list mini preview */}
          {sourcePrograms.length > 0 ? (
            <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground flex flex-wrap gap-2 items-center">
              <span className="font-semibold text-foreground">Program tersalin:</span>
              {sourcePrograms.map((p) => (
                <span
                  key={p.id}
                  className="rounded bg-muted px-2 py-0.5 text-foreground font-mono text-[11px]"
                >
                  {p.start_time}–{p.end_time} {p.name}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-xs text-amber-500 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Hari {DAY_NAMES[sourceDay]} belum memiliki program. Pilih hari lain yang sudah terisi.
            </div>
          )}
        </div>

        {/* Target Hari */}
        <div className="rounded-lg border border-border bg-card/60 p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              2. Pilih Hari Tujuan (Target Salinan)
            </span>
            <div className="flex gap-1 text-xs">
              <button
                type="button"
                onClick={selectWeekdayTargets}
                className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Senin–Jumat
              </button>
              <button
                type="button"
                onClick={selectAllTargets}
                className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Semua Hari
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {DAY_SHORT.map((sName, idx) => {
              const isSource = sourceDay === idx;
              const isTarget = targetDays.includes(idx);
              const count = programs.filter((p) => p.day_of_week === idx).length;
              return (
                <button
                  key={sName}
                  type="button"
                  disabled={isSource}
                  onClick={() => toggleTargetDay(idx)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border py-2 text-center transition select-none cursor-pointer",
                    isSource && "opacity-30 border-dashed cursor-not-allowed bg-muted/40",
                    !isSource &&
                      isTarget &&
                      "border-accent bg-accent/20 text-accent font-bold ring-2 ring-accent/30",
                    !isSource &&
                      !isTarget &&
                      "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="text-xs flex items-center gap-0.5">
                    {sName}
                    {isTarget && <Check className="h-3 w-3" />}
                  </span>
                  <span className="text-[10px] opacity-80">
                    {isSource ? "Sumber" : `${count} slot`}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Target terpilih:{" "}
            {targetDays.length > 0 ? (
              <strong className="text-foreground">
                {targetDays.map((d) => DAY_NAMES[d]).join(", ")}
              </strong>
            ) : (
              <span className="text-amber-500 font-medium">Belum ada hari target yang dipilih</span>
            )}
          </p>
        </div>

        {/* Opsi Timpa / Tambahkan */}
        <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs space-y-2">
          <span className="font-semibold text-foreground">Metode Penyalinan:</span>
          <div className="grid gap-2 sm:grid-cols-2">
            <label
              className={cn(
                "flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer transition",
                overwrite
                  ? "border-brand bg-brand/10 text-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              <input
                type="radio"
                name="copyMode"
                checked={overwrite}
                onChange={() => setOverwrite(true)}
                className="mt-0.5"
              />
              <div>
                <p className="font-medium text-foreground">Gantikan (Replace)</p>
                <p className="text-[11px] text-muted-foreground">
                  Hapus jadwal lama di hari target lalu ganti penuh dengan susunan hari sumber (disarankan agar rapi).
                </p>
              </div>
            </label>

            <label
              className={cn(
                "flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer transition",
                !overwrite
                  ? "border-brand bg-brand/10 text-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              <input
                type="radio"
                name="copyMode"
                checked={!overwrite}
                onChange={() => setOverwrite(false)}
                className="mt-0.5"
              />
              <div>
                <p className="font-medium text-foreground">Gabungkan (Append)</p>
                <p className="text-[11px] text-muted-foreground">
                  Tetap simpan program yang sudah ada di hari target dan sisipkan program baru dari hari sumber.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            onClick={onExecuteCopy}
            disabled={sourcePrograms.length === 0 || targetDays.length === 0}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            <span>
              Salin {sourcePrograms.length} Program ke {targetDays.length} Hari
            </span>
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
