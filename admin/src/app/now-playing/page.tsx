"use client";

import { useMemo, useState } from "react";
import { Radio, Save } from "lucide-react";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useToday } from "@/hooks/useToday";
import { updateNowPlaying } from "@/lib/data-store";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { DAY_NAMES, formatDateTime } from "@/lib/utils";

function NowPlayingForm({
  initialProgram,
  initialHost,
  initialCover,
  uniquePrograms,
  formKey,
}: {
  initialProgram: string;
  initialHost: string;
  initialCover: string;
  uniquePrograms: { name: string; host: string; cover: string | null }[];
  formKey: string;
}) {
  const toast = useToast();
  const [program, setProgram] = useState(initialProgram);
  const [host, setHost] = useState(initialHost);
  const [coverUrl, setCoverUrl] = useState(initialCover);
  const [saving, setSaving] = useState(false);

  // formKey forces remount when store resets — avoids setState-in-effect
  void formKey;

  const onPickProgram = (name: string) => {
    setProgram(name);
    const match = uniquePrograms.find((p) => p.name === name);
    if (match) {
      setHost(match.host);
      if (match.cover) setCoverUrl(match.cover);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!program.trim()) {
      toast.push("Nama program wajib diisi", "error");
      return;
    }
    setSaving(true);
    try {
      updateNowPlaying({
        current_program: program.trim(),
        current_host: host.trim() || "Gaul FM",
        current_cover_url: coverUrl.trim() || null,
      });
      toast.push("Now Playing di-update — app listener akan menerima data ini");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Pilih dari jadwal" hint="Otomatis mengisi host & cover">
        <Select
          value={uniquePrograms.some((p) => p.name === program) ? program : ""}
          onChange={(e) => {
            if (e.target.value) onPickProgram(e.target.value);
          }}
        >
          <option value="">— Manual / pilih program —</option>
          {uniquePrograms.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name} · {p.host}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Nama program">
        <Input
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          placeholder="Drive Time Gaul"
          required
        />
      </Field>

      <Field label="Host / penyiar">
        <Input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="Yoga & Sinta"
        />
      </Field>

      <Field label="Cover URL" hint="Nanti bisa diganti upload ke Supabase Storage">
        <Input
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          placeholder="https://…"
        />
      </Field>

      <Button type="submit" variant="orange" disabled={saving} className="w-full">
        <Save className="h-4 w-4" />
        {saving ? "Menyimpan…" : "Update Now Playing"}
      </Button>

      {/* Live preview of draft */}
      <div className="overflow-hidden rounded-lg border-border">
        <div className="relative h-36 bg-muted">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute left-3 top-3">
            <Badge tone="live" pulse>
              Draft preview
            </Badge>
          </div>
        </div>
        <div className="p-3">
          <p className="font-extrabold tracking-tight">{program || "—"}</p>
          <p className="text-sm text-muted-foreground">{host || "—"}</p>
        </div>
      </div>
    </form>
  );
}

export default function NowPlayingPage() {
  const { nowPlaying, programs } = useAdminStore();

  const uniquePrograms = useMemo(() => {
    const map = new Map<
      string,
      { name: string; host: string; cover: string | null }
    >();
    for (const p of programs) {
      if (!map.has(p.name)) {
        map.set(p.name, {
          name: p.name,
          host: p.host,
          cover: p.cover_url,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [programs]);

  const today = useToday();
  const todaySlots = programs
    .filter((p) => p.day_of_week === today)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Now Playing"
        description="Kontrol info siaran aktif yang tampil di app mobile (home hero, mini player, lock screen)."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="card-gradient lg:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-orange" />
              <CardTitle>Update siaran aktif</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <NowPlayingForm
              key={nowPlaying.updated_at}
              formKey={nowPlaying.updated_at}
              initialProgram={nowPlaying.current_program}
              initialHost={nowPlaying.current_host}
              initialCover={nowPlaying.current_cover_url ?? ""}
              uniquePrograms={uniquePrograms}
            />
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="on-air-glow overflow-hidden">
            <div className="relative h-44 bg-muted">
              {nowPlaying.current_cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={nowPlaying.current_cover_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute left-3 top-3">
                <Badge tone="live" pulse>
                  On air now
                </Badge>
              </div>
            </div>
            <CardContent className="pt-4">
              <p className="text-lg font-extrabold tracking-tight">
                {nowPlaying.current_program}
              </p>
              <p className="text-sm text-muted-foreground">
                {nowPlaying.current_host}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Last updated: {formatDateTime(nowPlaying.updated_at)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Today&apos;s slots · {DAY_NAMES[today]}
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-56 space-y-1 overflow-y-auto">
              {todaySlots.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    updateNowPlaying({
                      current_program: p.name,
                      current_host: p.host,
                      current_cover_url: p.cover_url,
                    });
                  }}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition hover:bg-muted"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.start_time}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
