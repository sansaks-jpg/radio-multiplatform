"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useToday } from "@/hooks/useToday";
import { deleteProgram, upsertProgram } from "@/lib/data-store";
import type { Program } from "@/lib/types";
import { DAY_NAMES, DAY_SHORT, hasTimeOverlap, uid } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type FormState = {
  id?: string;
  name: string;
  host: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  cover_url: string;
  description: string;
};

const emptyForm = (day: number): FormState => ({
  name: "",
  host: "Gaul Squad",
  day_of_week: day,
  start_time: "09:00",
  end_time: "12:00",
  cover_url: "",
  description: "",
});

export default function SchedulePage() {
  const { programs } = useAdminStore();
  const toast = useToast();
  const today = useToday();
  const [day, setDay] = useState(today);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(today));
  const [error, setError] = useState<string | null>(null);

  const dayPrograms = useMemo(
    () =>
      programs
        .filter((p) => p.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [programs, day],
  );

  const openCreate = () => {
    setForm(emptyForm(day ?? today));
    setError(null);
    setOpen(true);
  };

  const openEdit = (p: Program) => {
    setForm({
      id: p.id,
      name: p.name,
      host: p.host,
      day_of_week: p.day_of_week,
      start_time: p.start_time,
      end_time: p.end_time,
      cover_url: p.cover_url ?? "",
      description: p.description,
    });
    setError(null);
    setOpen(true);
  };

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.host.trim()) {
      setError("Nama program dan host wajib diisi");
      return;
    }
    if (!form.start_time || !form.end_time) {
      setError("Waktu mulai & selesai wajib");
      return;
    }

    const others = programs.filter(
      (p) => p.day_of_week === form.day_of_week && p.id !== form.id,
    );
    const clash = others.find((p) =>
      hasTimeOverlap(form.start_time, form.end_time, p.start_time, p.end_time),
    );
    if (clash) {
      setError(
        `Bentrok dengan “${clash.name}” (${clash.start_time}–${clash.end_time})`,
      );
      return;
    }

    upsertProgram({
      id: form.id ?? uid("prog"),
      name: form.name.trim(),
      host: form.host.trim(),
      day_of_week: form.day_of_week,
      start_time: form.start_time,
      end_time: form.end_time,
      cover_url: form.cover_url.trim() || null,
      description: form.description.trim(),
    });
    toast.push(form.id ? "Program diperbarui" : "Program ditambahkan");
    setOpen(false);
  };

  const onDelete = (p: Program) => {
    if (!confirm(`Hapus “${p.name}”?`)) return;
    deleteProgram(p.id);
    toast.push("Program dihapus", "info");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        title="Jadwal Siaran Mingguan"
        badge={<Badge tone="brand">{programs.length} Slot Siaran</Badge>}
        description="Kelola agenda program siaran 7 hari studio Gaul FM. Terhubung langsung ke jadwal aplikasi mobile pendengar."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Program</span>
          </Button>
        }
      />

      {/* Day pills */}
      <div className="flex flex-wrap gap-2">
        {DAY_SHORT.map((label, i) => {
          const count = programs.filter((p) => p.day_of_week === i).length;
          const active = day === i;
          const isToday = today === i;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setDay(i)}
              className={cn(
                "min-w-18 rounded-md border px-3 py-2 text-center transition",
                active
                  ? "border-brand bg-brand text-brand-foreground"
                  : isToday
                    ? "border-accent/40 bg-accent-soft text-foreground"
                    : "border-border bg-card hover:bg-muted",
              )}
            >
              <span className="flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wide">
                {label}
                {isToday && !active ? (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                ) : null}
              </span>
              <span
                className={cn(
                  "text-[10px]",
                  active ? "text-brand-foreground/80" : "text-muted-foreground",
                )}
              >
                {count} slot
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Agenda {DAY_NAMES[day]}</h2>
        <Badge tone="muted">{dayPrograms.length} program</Badge>
      </div>

      {dayPrograms.length === 0 ? (
        <EmptyState
          title="Belum ada program hari ini"
          description="Tambah slot siaran untuk hari ini."
          action={
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4" />
              Tambah
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {dayPrograms.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  {p.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.cover_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold tracking-tight">{p.name}</p>
                    <Badge tone="brand">
                      {p.start_time}–{p.end_time}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Host · {p.host}
                  </p>
                  {p.description ? (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {p.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(p)}
                    className="text-danger hover:bg-danger-soft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? "Edit Program Siaran" : "Tambah Program Siaran"}
        description="Isi detail informasi program siaran studio dan jam tayang on-air."
        wide
      >
        <form onSubmit={onSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama program">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field
              label="Host / Penyiar"
              hint="Default: Gaul Squad (Penyiar rolling real-time di Now Playing)"
            >
              <Input
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                placeholder="Gaul Squad"
                required
              />
            </Field>
            <Field label="Hari">
              <Select
                value={String(form.day_of_week)}
                onChange={(e) =>
                  setForm({ ...form, day_of_week: Number(e.target.value) })
                }
              >
                {DAY_NAMES.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mulai">
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) =>
                    setForm({ ...form, start_time: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Selesai">
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e) =>
                    setForm({ ...form, end_time: e.target.value })
                  }
                  required
                />
              </Field>
            </div>
            <Field label="Cover URL" className="sm:col-span-2">
              <Input
                value={form.cover_url}
                onChange={(e) =>
                  setForm({ ...form, cover_url: e.target.value })
                }
                placeholder="https://…"
              />
            </Field>
            <Field label="Deskripsi" className="sm:col-span-2">
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
              />
            </Field>
          </div>

          {error ? (
            <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
