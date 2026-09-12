"use client";

import { useState } from "react";
import {
  Pencil,
  Plus,
  Trash2,
  Upload,
  Loader2,
  Mic,
  AtSign,
  Radio,
  Sparkles,
  Check,
} from "lucide-react";
import { useAdminStore } from "@/hooks/useAdminStore";
import { deleteAnnouncer, upsertAnnouncer } from "@/lib/data-store";
import { supabase } from "@/lib/supabase";
import type { Announcer } from "@/lib/types";
import { uid } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

const PRESET_STUDIO_PHOTOS = [
  { name: "Attaya", url: "https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/penyiar/attaya.png?v=1789192301137" },
  { name: "Ega Ratu", url: "https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/penyiar/ega-ratu.png?v=1789192301137" },
  { name: "Kara Ferina", url: "https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/penyiar/kara-ferina.png?v=1789192301137" },
  { name: "Nafa", url: "https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/penyiar/nafa.png?v=1789192301137" },
  { name: "Nanda", url: "https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/penyiar/nanda.png?v=1789192301137" },
  { name: "Rizky", url: "https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/penyiar/rizky.png?v=1789192301137" },
  { name: "Tyas", url: "https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/penyiar/tyas.png?v=1789192301137" },
];

type FormState = {
  id?: string;
  name: string;
  nickname: string;
  photo_url: string;
  bio: string;
  instagram: string;
  programs: string[];
  sort_order: number;
  is_active: boolean;
};

const empty = (): FormState => ({
  name: "",
  nickname: "",
  photo_url: PRESET_STUDIO_PHOTOS[0].url,
  bio: "Gaul FM Announcer",
  instagram: "@radiogaulfm_smg",
  programs: [],
  sort_order: 1,
  is_active: true,
});

export default function AnnouncersPage() {
  const { announcers, programs } = useAdminStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty());
  const [uploading, setUploading] = useState(false);
  const [customProgramInput, setCustomProgramInput] = useState("");

  // Ambil daftar nama program unik dari jadwal siaran yang ada
  const availableProgramNames = Array.from(
    new Set(
      programs
        .map((p) => p.name.trim())
        .filter((n) => Boolean(n) && n.toLowerCase() !== "gaul squad")
    )
  );

  // Pastikan program unggulan standar selalu ada dalam opsi
  ["Gaul Morning Show", "Gaul Waktu Setempat", "Asupan Gaul"].forEach((std) => {
    if (!availableProgramNames.includes(std)) {
      availableProgramNames.push(std);
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!supabase) {
      toast.push("Supabase belum terkonfigurasi untuk upload gambar", "error");
      return;
    }
    try {
      setUploading(true);
      const ext = file.name.split(".").pop() || "png";
      const cleanFileName = `penyiar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("penyiar")
        .upload(cleanFileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("penyiar").getPublicUrl(cleanFileName);

      setForm((prev) => ({ ...prev, photo_url: publicUrl }));
      toast.push("Foto penyiar berhasil diunggah!", "success");
    } catch (err) {
      toast.push("Gagal mengunggah: " + (err as Error).message, "error");
    } finally {
      setUploading(false);
    }
  };

  const toggleProgram = (programName: string) => {
    setForm((prev) => {
      const exists = prev.programs.includes(programName);
      const nextPrograms = exists
        ? prev.programs.filter((p) => p !== programName)
        : [...prev.programs, programName];
      return { ...prev, programs: nextPrograms };
    });
  };

  const handleAddCustomProgram = () => {
    const trimmed = customProgramInput.trim();
    if (!trimmed) return;
    if (!form.programs.includes(trimmed)) {
      setForm((prev) => ({ ...prev, programs: [...prev.programs, trimmed] }));
    }
    setCustomProgramInput("");
  };

  const sortedAnnouncers = [...announcers].sort((a, b) => a.sort_order - b.sort_order);

  const openCreate = () => {
    setForm({
      ...empty(),
      sort_order: announcers.length + 1,
    });
    setOpen(true);
  };

  const openEdit = (ann: Announcer) => {
    setForm({
      id: ann.id,
      name: ann.name,
      nickname: ann.nickname ?? "",
      photo_url: ann.photo_url,
      bio: ann.bio ?? "",
      instagram: ann.instagram ?? "",
      programs: ann.programs ? [...ann.programs] : [],
      sort_order: ann.sort_order,
      is_active: ann.is_active,
    });
    setOpen(true);
  };

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.photo_url.trim()) {
      toast.push("Nama lengkap dan foto penyiar wajib diisi", "error");
      return;
    }

    upsertAnnouncer({
      id: form.id ?? uid("ann"),
      name: form.name.trim(),
      nickname: form.nickname.trim() || null,
      photo_url: form.photo_url.trim(),
      bio: form.bio.trim() || null,
      instagram: form.instagram.trim() || null,
      programs: form.programs,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    });

    toast.push(
      form.id
        ? `Profil ${form.name} berhasil diperbarui!`
        : `Penyiar ${form.name} berhasil ditambahkan!`,
      "success"
    );
    setOpen(false);
  };

  const onDelete = (ann: Announcer) => {
    if (confirm(`Hapus data penyiar "${ann.name}"?`)) {
      deleteAnnouncer(ann.id);
      toast.push(`Penyiar "${ann.name}" telah dihapus.`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Penyiar"
        description="Kelola profil Gaul Squad, perbarui foto resmi studio (anti-potong), dan atur jadwal penugasan program siaran."
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Penyiar
          </Button>
        }
      />

      {sortedAnnouncers.length === 0 ? (
        <EmptyState
          title="Belum ada data penyiar"
          description="Tambahkan penyiar Gaul FM baru untuk ditampilkan di aplikasi mobile dan panel siaran."
          action={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Penyiar
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedAnnouncers.map((ann) => {
            const hasPrograms = ann.programs && ann.programs.length > 0;

            return (
              <Card
                key={ann.id}
                className={`overflow-hidden transition-all border ${
                  ann.is_active
                    ? "border-border hover:border-brand/40"
                    : "opacity-60 border-dashed border-border"
                }`}
              >
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div>
                    {/* Top row: Avatar & Status */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="relative">
                        <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-brand/50 bg-muted/60 shadow-sm flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ann.photo_url}
                            alt={ann.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        {ann.is_active ? (
                          <span
                            className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-card"
                            title="Penyiar Aktif"
                          />
                        ) : (
                          <span
                            className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-muted-foreground border-2 border-card"
                            title="Penyiar Nonaktif"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Badge tone={ann.is_active ? "success" : "muted"} className="text-[10px]">
                          {ann.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                        <Badge tone="default" className="text-[10px]">
                          #{ann.sort_order}
                        </Badge>
                      </div>
                    </div>

                    {/* Name & Nickname */}
                    <div className="mb-3">
                      <h3 className="font-bold text-base text-foreground tracking-tight line-clamp-1">
                        {ann.name}
                      </h3>
                      <p className="text-xs font-semibold text-brand">
                        {ann.nickname ? `"${ann.nickname}"` : "Penyiar"}
                      </p>
                      {ann.instagram && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <AtSign className="h-3 w-3 shrink-0 text-brand" />
                          <span className="truncate">{ann.instagram}</span>
                        </p>
                      )}
                    </div>

                    {/* Program Siaran (Dimana aja siaran) */}
                    <div className="pt-2 border-t border-border/60">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Radio className="h-3 w-3 text-brand" />
                        Program Siaran:
                      </p>
                      {hasPrograms ? (
                        <div className="flex flex-wrap gap-1.5">
                          {ann.programs!.map((prog) => (
                            <span
                              key={prog}
                              className="text-[11px] font-medium bg-brand/10 text-brand px-2 py-0.5 rounded-md border border-brand/20"
                            >
                              {prog}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">
                          Mengudara di seluruh program (Gaul Squad)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="mt-5 pt-3 border-t border-border flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(ann)}
                      className="gap-1.5 text-xs h-8"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(ann)}
                      className="gap-1.5 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-8"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Penyiar */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? "Edit Profil Penyiar" : "Tambah Penyiar Baru"}
      >
        <form onSubmit={onSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nama Lengkap *" hint="Contoh: Attaya, Kara Ferina">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama penyiar..."
                required
              />
            </Field>

            <Field label="Nama Panggilan (Nickname)" hint="Contoh: Attaya, Kara">
              <Input
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                placeholder="Nama panggilan..."
              />
            </Field>
          </div>

          {/* Section Foto Penyiar & Live Preview Anti-Potong */}
          <div className="rounded-lg border border-border/80 bg-muted/20 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-brand" />
                Foto Profil Penyiar (Anti-Potong)
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">Format 1:1</span>
            </div>

            <Field label="URL Foto Penyiar *">
              <Input
                value={form.photo_url}
                onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                placeholder="https://..."
                required
              />
            </Field>

            {/* Opsi Preset Cepat & Upload */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  className="text-xs gap-1.5 cursor-pointer"
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement?.querySelector("input");
                    input?.click();
                  }}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  <span>{uploading ? "Mengunggah..." : "Upload Foto Baru"}</span>
                </Button>
              </label>

              <div className="text-[11px] text-muted-foreground">atau pilih preset studio:</div>

              <div className="flex flex-wrap gap-1">
                {PRESET_STUDIO_PHOTOS.map((preset) => {
                  const isSelected = form.photo_url === preset.url;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setForm({ ...form, photo_url: preset.url })}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                        isSelected
                          ? "bg-brand text-brand-foreground border-brand font-bold"
                          : "bg-card text-foreground border-border hover:border-brand/50"
                      }`}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Dual Preview: Avatar Bulat & Kartu Persegi */}
            {form.photo_url && (
              <div className="mt-3 p-3 rounded-md bg-card border border-border flex items-center gap-4">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-brand mx-auto bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.photo_url}
                      alt="Preview Bulat"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 block">Preview Bulat</span>
                </div>

                <div className="text-center">
                  <div className="h-16 w-16 rounded-lg overflow-hidden border border-border mx-auto bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.photo_url}
                      alt="Preview Kotak"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 block">Preview Kotak</span>
                </div>

                <div className="flex-1 text-xs text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-foreground">Framing Aman Terverifikasi</p>
                  <p className="text-[11px]">
                    Foto berpusat 1:1, menjamin bagian kepala, dagu, dan pundak tidak terpotong saat ditampilkan di aplikasi pendengar maupun panel siaran.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Program Siaran (Dimana Saja Penyiar Siaran) */}
          <div className="rounded-lg border border-border/80 bg-muted/20 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-brand" />
                Penugasan Program Siaran
              </label>
              <span className="text-[11px] text-brand font-medium">
                {form.programs.length} Program Dipilih
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Pilih di program mana saja penyiar ini mengudara. Aplikasi mobile akan menampilkan penyiar secara otomatis pada jadwal acara tersebut.
            </p>

            {/* Checklist Program */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {availableProgramNames.map((progName) => {
                const isChecked = form.programs.includes(progName);
                return (
                  <button
                    key={progName}
                    type="button"
                    onClick={() => toggleProgram(progName)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium text-left transition-all ${
                      isChecked
                        ? "bg-brand/15 border-brand text-brand font-bold shadow-xs"
                        : "bg-card border-border text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span className="truncate mr-2">{progName}</span>
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                        isChecked ? "bg-brand border-brand text-brand-foreground" : "border-border"
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tambah program custom */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <Input
                value={customProgramInput}
                onChange={(e) => setCustomProgramInput(e.target.value)}
                placeholder="Ketik nama program khusus/event lain..."
                className="text-xs h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomProgram();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomProgram}
                className="text-xs shrink-0 h-8 gap-1"
              >
                <Plus className="h-3 w-3" />
                Tambah
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Instagram" hint="Contoh: @attaya_gaul">
              <Input
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                placeholder="@username"
              />
            </Field>

            <Field label="Urutan Tampil" hint="Nomor urut tampilan di daftar">
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>

          <Field label="Bio / Catatan">
            <Input
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Bio ringkas penyiar..."
            />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded accent-brand"
            />
            <span className="text-xs font-semibold text-foreground">
              Penyiar Aktif (Tampilkan di aplikasi dan rotasi siaran)
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan Penyiar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
