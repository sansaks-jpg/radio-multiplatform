"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MultiDaySelector } from "./MultiDaySelector";
import { upsertProgram, upsertProgramsBatch, deleteProgramsBatch, DEFAULT_PROGRAM_COVER } from "@/lib/data-store";
import type { Program } from "@/lib/types";
import { DAY_NAMES, DAY_SHORT, hasTimeOverlap, uid } from "@/lib/utils";
import { Sparkles, Calendar, Layers, Clock } from "lucide-react";

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
  programToEdit: Program | null; // null jika create
  allPrograms: Program[];
  defaultDay: number;
  onSuccessToast: (msg: string) => void;
}

const PRESET_COVERS = [
  {
    label: "Gaul Morning Show (Resmi)",
    url: "/programs/gaul-morning-show.png",
  },
  {
    label: "Gaul Waktu Setempat (Resmi)",
    url: "/programs/gaul-waktu-setempat.png",
  },
  {
    label: "Asupan Gaul (Resmi)",
    url: "/programs/asupan-gaul.png",
  },
];

export function ScheduleModal({
  open,
  onClose,
  programToEdit,
  allPrograms,
  defaultDay,
  onSuccessToast,
}: ScheduleModalProps) {
  const [name, setName] = useState("");
  const [host, setHost] = useState("Gaul Squad");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([defaultDay]);
  const [syncAllDays, setSyncAllDays] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cari saudara program (program dengan nama yang sama di hari lain)
  const siblingPrograms = useMemo(() => {
    if (!programToEdit) return [];
    return allPrograms.filter(
      (p) =>
        p.name.trim().toLowerCase() === programToEdit.name.trim().toLowerCase(),
    );
  }, [programToEdit, allPrograms]);

  // Inisialisasi form saat modal terbuka atau programToEdit berubah
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (programToEdit) {
      setName(programToEdit.name);
      setHost(programToEdit.host);
      setStartTime(programToEdit.start_time);
      setEndTime(programToEdit.end_time);
      setCoverUrl(programToEdit.cover_url ?? "");
      setDescription(programToEdit.description);

      // Ambil seluruh hari di mana program ini tayang
      const days = allPrograms
        .filter(
          (p) =>
            p.name.trim().toLowerCase() ===
            programToEdit.name.trim().toLowerCase(),
        )
        .map((p) => p.day_of_week)
        .sort((a, b) => a - b);

      setSelectedDays(days.length > 0 ? days : [programToEdit.day_of_week]);
      setSyncAllDays(true);
    } else {
      setName("");
      setHost("Gaul Squad");
      setStartTime("09:00");
      setEndTime("12:00");
      setCoverUrl(DEFAULT_PROGRAM_COVER);
      setDescription("");
      // Default jika hari kerja pilih Senin-Jumat, jika akhir pekan pilih Sabtu-Minggu
      if (defaultDay >= 1 && defaultDay <= 5) {
        setSelectedDays([1, 2, 3, 4, 5]);
      } else {
        setSelectedDays([defaultDay]);
      }
      setSyncAllDays(true);
    }
  }, [open, programToEdit, allPrograms, defaultDay]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanHost = host.trim();

    if (!cleanName || !cleanHost) {
      setError("Nama program dan host/penyiar wajib diisi");
      return;
    }
    if (!startTime || !endTime) {
      setError("Jam mulai dan selesai wajib diisi");
      return;
    }
    if (selectedDays.length === 0) {
      setError("Pilih minimal satu hari tayang");
      return;
    }

    // Validasi tabrakan / overlap untuk setiap hari yang dipilih
    for (const d of selectedDays) {
      // Kecualikan program yang sedang diedit (atau sibling yang sedang diedit jika syncAllDays)
      const excludeIds = new Set<string>();
      if (programToEdit) {
        if (syncAllDays) {
          siblingPrograms.forEach((sp) => excludeIds.add(sp.id));
        } else if (d === programToEdit.day_of_week) {
          excludeIds.add(programToEdit.id);
        }
      }

      const othersOnDay = allPrograms.filter(
        (p) => p.day_of_week === d && !excludeIds.has(p.id),
      );

      const clash = othersOnDay.find((p) =>
        hasTimeOverlap(startTime, endTime, p.start_time, p.end_time),
      );

      if (clash) {
        setError(
          `Bentrok pada hari ${DAY_NAMES[d]} dengan program "${clash.name}" (${clash.start_time}–${clash.end_time})`,
        );
        return;
      }
    }

    // MODE CREATE (Tambah Program Baru)
    if (!programToEdit) {
      const newItems = selectedDays.map((d) => ({
        id: uid("prog"),
        name: cleanName,
        host: cleanHost,
        day_of_week: d,
        start_time: startTime,
        end_time: endTime,
        cover_url: coverUrl.trim() || null,
        description: description.trim(),
      }));

      upsertProgramsBatch(newItems);
      onSuccessToast(
        `Program "${cleanName}" berhasil dibuat untuk ${selectedDays.length} hari siaran`,
      );
      onClose();
      return;
    }

    // MODE EDIT (Edit Program yang Sudah Ada)
    if (!syncAllDays) {
      // Hanya ubah untuk 1 hari ini saja
      upsertProgram({
        id: programToEdit.id,
        name: cleanName,
        host: cleanHost,
        day_of_week: programToEdit.day_of_week,
        start_time: startTime,
        end_time: endTime,
        cover_url: coverUrl.trim() || null,
        description: description.trim(),
      });
      onSuccessToast(
        `Program "${cleanName}" diperbarui untuk hari ${DAY_NAMES[programToEdit.day_of_week]}`,
      );
      onClose();
      return;
    }

    // Sinkronisasi ke seluruh hari tayang yang dipilih:
    // 1. Cek sibling mana yang harinya di-uncheck -> hapus
    const newDaySet = new Set(selectedDays);
    const siblingsToDelete = siblingPrograms.filter(
      (sp) => !newDaySet.has(sp.day_of_week),
    );
    if (siblingsToDelete.length > 0) {
      deleteProgramsBatch(siblingsToDelete.map((sp) => sp.id));
    }

    // 2. Untuk setiap hari terpilih, jika sudah ada sibling -> update, jika belum -> create baru
    const itemsToUpsert: (Omit<Program, "id"> & { id?: string })[] = [];
    selectedDays.forEach((d) => {
      const existingSibling = siblingPrograms.find((sp) => sp.day_of_week === d);
      itemsToUpsert.push({
        id: existingSibling ? existingSibling.id : uid("prog"),
        name: cleanName,
        host: cleanHost,
        day_of_week: d,
        start_time: startTime,
        end_time: endTime,
        cover_url: coverUrl.trim() || null,
        description: description.trim(),
      });
    });

    upsertProgramsBatch(itemsToUpsert);
    onSuccessToast(
      `Program "${cleanName}" berhasil diperbarui di ${selectedDays.length} hari tayang`,
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        programToEdit
          ? `Edit Program: ${programToEdit.name}`
          : "Tambah Program Siaran Baru"
      }
      description="Kelola slot jam siaran, penyiar on-air, dan hari tayang mingguan secara efisien."
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Nama & Host */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama Program" hint="Contoh: Gaul Morning Show, Asupan Gaul">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama program acara"
              required
            />
          </Field>

          <Field
            label="Host / Penyiar Utama"
            hint="Penyiar tetap atau tim default (misal: Gaul Squad)"
          >
            <Input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="Gaul Squad"
              required
            />
          </Field>
        </div>

        {/* Waktu Mulai & Selesai */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jam Mulai">
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </Field>
          <Field label="Jam Selesai">
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </Field>
        </div>

        {/* Multi-Day Selector */}
        <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-brand" />
              Pilih Hari Siaran (Bisa Banyak Hari Sekaligus)
            </span>
            <Badge tone="brand">{selectedDays.length} hari aktif</Badge>
          </div>

          <MultiDaySelector
            selectedDays={selectedDays}
            onChange={setSelectedDays}
            disabled={Boolean(programToEdit && !syncAllDays)}
          />

          {/* Opsi Sinkronisasi saat Edit */}
          {programToEdit && siblingPrograms.length > 1 && (
            <div className="mt-3 pt-3 border-t border-border/60 text-xs space-y-2">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-accent" />
                Cakupan Perubahan:
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                <label
                  className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer transition ${
                    syncAllDays
                      ? "border-brand bg-brand/10 text-foreground"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="syncScope"
                    checked={syncAllDays}
                    onChange={() => setSyncAllDays(true)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-medium text-foreground">
                      Terapkan ke Semua Hari Siaran
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Otomatis update jam, host, dan cover di semua hari acara ini tayang.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer transition ${
                    !syncAllDays
                      ? "border-brand bg-brand/10 text-foreground"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="syncScope"
                    checked={!syncAllDays}
                    onChange={() => {
                      setSyncAllDays(false);
                      setSelectedDays([programToEdit.day_of_week]);
                    }}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-medium text-foreground">
                      Hanya Hari {DAY_NAMES[programToEdit.day_of_week]} Saja
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Jangan ubah jadwal di hari lainnya.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Cover Gambar & Preset */}
        <div className="space-y-1.5">
          <Field
            label="Cover Program URL"
            hint="URL gambar poster/banner program siaran"
          >
            <Input
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
            />
          </Field>
          <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-brand" />
              Pilih Cepat Cover:
            </span>
            {PRESET_COVERS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setCoverUrl(preset.url)}
                className="rounded border border-border bg-card px-2 py-0.5 text-[11px] hover:bg-muted text-foreground transition cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Deskripsi */}
        <Field label="Deskripsi Acara">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Deskripsi singkat konten siaran, segmen acara, target pendengar..."
          />
        </Field>

        {error && (
          <div className="rounded-md bg-danger-soft p-3 text-xs text-danger font-medium">
            ⚠️ {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {selectedDays.length > 1
              ? `⚡ Akan memproses ${selectedDays.length} slot hari sekaligus`
              : `1 slot hari (${DAY_NAMES[selectedDays[0] ?? defaultDay]})`}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">
              {programToEdit ? "Simpan Perubahan" : `Buat di ${selectedDays.length} Hari`}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
