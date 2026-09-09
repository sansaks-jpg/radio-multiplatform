"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAdminStore } from "@/hooks/useAdminStore";
import { deleteBanner, upsertBanner } from "@/lib/data-store";
import type { Banner, BannerType } from "@/lib/types";
import { uid } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

type FormState = {
  id?: string;
  title: string;
  subtitle: string;
  image_url: string;
  cta_label: string;
  link_to: "" | "schedule" | "news" | "profile";
  link_url: string;
  type: BannerType;
  sort_order: number;
  is_active: boolean;
};

const empty = (): FormState => ({
  title: "",
  subtitle: "",
  image_url: "",
  cta_label: "",
  link_to: "",
  link_url: "",
  type: "program",
  sort_order: 0,
  is_active: true,
});

export default function BannersPage() {
  const { banners } = useAdminStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty());

  const sorted = [...banners].sort((a, b) => a.sort_order - b.sort_order);

  const openCreate = () => {
    setForm({ ...empty(), sort_order: banners.length });
    setOpen(true);
  };

  const openEdit = (b: Banner) => {
    setForm({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle ?? "",
      image_url: b.image_url,
      cta_label: b.cta_label ?? "",
      link_to: b.link_to ?? "",
      link_url: b.link_url ?? "",
      type: b.type,
      sort_order: b.sort_order,
      is_active: b.is_active,
    });
    setOpen(true);
  };

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.image_url.trim()) {
      toast.push("Judul & image URL wajib", "error");
      return;
    }
    upsertBanner({
      id: form.id ?? uid("ban"),
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      image_url: form.image_url.trim(),
      cta_label: form.cta_label.trim() || null,
      link_to: form.link_to || null,
      link_url: form.link_url.trim() || null,
      type: form.type,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    });
    toast.push(form.id ? "Banner diperbarui" : "Banner ditambahkan");
    setOpen(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        title="Banner Promosi"
        badge={<Badge tone="brand">{banners.length} Banner</Badge>}
        description="Kelola banner promosi dan highlight program siaran yang tampil pada carousel beranda aplikasi mobile."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            <span>Banner Baru</span>
          </Button>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState
          title="Belum ada banner"
          description="Tambahkan banner untuk mengisi carousel promo beranda aplikasi mobile."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Banner</span>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((b) => (
            <Card key={b.id} className={!b.is_active ? "opacity-70" : undefined}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="h-20 w-36 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge tone="brand">
                      {b.type === "program" ? "Program" : b.type === "event" ? "Event" : "Iklan"}
                    </Badge>
                    <Badge tone={b.is_active ? "success" : "muted"}>
                      {b.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      Urutan #{b.sort_order}
                    </span>
                  </div>
                  <p className="font-semibold tracking-tight text-foreground">{b.title}</p>
                  {b.subtitle ? (
                    <p className="text-sm text-muted-foreground">{b.subtitle}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger-soft"
                    onClick={() => {
                      if (confirm("Hapus banner?")) {
                        deleteBanner(b.id);
                        toast.push("Banner dihapus", "info");
                      }
                    }}
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
        title={form.id ? "Edit Banner Promosi" : "Tambah Banner Promosi"}
        description="Lengkapi detail banner untuk tayang di carousel aplikasi mobile."
        wide
      >
        <form onSubmit={onSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Judul" className="sm:col-span-2">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Field>
            <Field label="Subtitle" className="sm:col-span-2">
              <Input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
            </Field>
            <Field label="Image URL" className="sm:col-span-2">
              <Input
                value={form.image_url}
                onChange={(e) =>
                  setForm({ ...form, image_url: e.target.value })
                }
                required
              />
            </Field>
            <Field label="CTA label">
              <Input
                value={form.cta_label}
                onChange={(e) =>
                  setForm({ ...form, cta_label: e.target.value })
                }
              />
            </Field>
            <Field label="Tipe">
              <Select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value as BannerType,
                  })
                }
              >
                <option value="program">Program</option>
                <option value="event">Event</option>
                <option value="ad">Ad</option>
              </Select>
            </Field>
            <Field label="Link tab app">
              <Select
                value={form.link_to}
                onChange={(e) =>
                  setForm({
                    ...form,
                    link_to: e.target.value as FormState["link_to"],
                  })
                }
              >
                <option value="">— none —</option>
                <option value="schedule">Schedule</option>
                <option value="news">News</option>
                <option value="profile">Profile</option>
              </Select>
            </Field>
            <Field label="Link URL eksternal">
              <Input
                value={form.link_url}
                onChange={(e) =>
                  setForm({ ...form, link_url: e.target.value })
                }
                placeholder="https://…"
              />
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm({ ...form, sort_order: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.is_active ? "1" : "0"}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.value === "1" })
                }
              >
                <option value="1">Active</option>
                <option value="0">Off</option>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
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
