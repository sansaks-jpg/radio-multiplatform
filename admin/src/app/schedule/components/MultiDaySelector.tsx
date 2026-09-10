"use client";

import { DAY_NAMES, DAY_SHORT, cn } from "@/lib/utils";

interface MultiDaySelectorProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
  disabled?: boolean;
}

export function MultiDaySelector({
  selectedDays,
  onChange,
  disabled = false,
}: MultiDaySelectorProps) {
  const toggleDay = (day: number) => {
    if (disabled) return;
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return; // Minimal 1 hari terpilih
      onChange(selectedDays.filter((d) => d !== day));
    } else {
      onChange([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  const selectWeekday = () => {
    if (disabled) return;
    onChange([1, 2, 3, 4, 5]);
  };

  const selectWeekend = () => {
    if (disabled) return;
    onChange([0, 6]);
  };

  const selectAll = () => {
    if (disabled) return;
    onChange([0, 1, 2, 3, 4, 5, 6]);
  };

  return (
    <div className="space-y-2">
      {/* Presets */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground mr-1">Preset Cepat:</span>
        <button
          type="button"
          disabled={disabled}
          onClick={selectWeekday}
          className="rounded border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground hover:bg-muted transition disabled:opacity-50"
        >
          ⚡ Senin–Jumat (5 hari)
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={selectWeekend}
          className="rounded border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground hover:bg-muted transition disabled:opacity-50"
        >
          ⚡ Akhir Pekan (Sab & Min)
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={selectAll}
          className="rounded border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground hover:bg-muted transition disabled:opacity-50"
        >
          ⚡ Setiap Hari (7 hari)
        </button>
      </div>

      {/* 7 Days Pills Checkboxes */}
      <div className="grid grid-cols-7 gap-1.5 pt-1">
        {DAY_SHORT.map((shortName, idx) => {
          const isSelected = selectedDays.includes(idx);
          return (
            <button
              key={shortName}
              type="button"
              disabled={disabled}
              onClick={() => toggleDay(idx)}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border py-2 text-center transition select-none cursor-pointer",
                isSelected
                  ? "border-brand bg-brand text-brand-foreground shadow-xs font-bold"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                disabled && "opacity-50 cursor-not-allowed",
              )}
              title={DAY_NAMES[idx]}
            >
              <span className="text-xs">{shortName}</span>
              <span className="text-[10px] font-normal opacity-80">
                {idx === 0 ? "Minggu" : `H-${idx}`}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Program akan aktif di <strong className="text-foreground">{selectedDays.length} hari</strong> (
        {selectedDays.map((d) => DAY_NAMES[d]).join(", ")})
      </p>
    </div>
  );
}
