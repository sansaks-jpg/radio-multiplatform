"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  CircleStop,
  ExternalLink,
  Key,
  Link2,
  Pencil,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Unplug,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

type Broadcast = {
  id: string;
  title: string;
  description?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  lifeCycleStatus?: string;
  privacyStatus?: string;
  boundStreamId?: string;
  enableAutoStart?: boolean;
  enableAutoStop?: boolean;
  enableDvr?: boolean;
  recordFromStart?: boolean;
  monitorStreamEnabled?: boolean;
};

type StreamIssue = { type?: string; severity?: string; reason?: string; description?: string };
type Stream = { id: string; title: string; streamKey?: string | null; streamStatus?: string; healthStatus?: string; issues?: StreamIssue[] };
type Status = {
  configured: boolean;
  connected: boolean;
  channel?: { id: string; title?: string; thumbnail?: string } | null;
  broadcasts?: Broadcast[];
  streams?: Stream[];
  error?: string;
};

type BroadcastForm = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  privacy: string;
  streamId: string;
  enableAutoStart: boolean;
  enableAutoStop: boolean;
  enableDvr: boolean;
  recordFromStart: boolean;
};

const EMPTY_FORM: BroadcastForm = {
  title: "",
  description: "",
  startTime: "",
  endTime: "",
  privacy: "unlisted",
  streamId: "",
  enableAutoStart: true,
  enableAutoStop: true,
  enableDvr: true,
  recordFromStart: true,
};

const STATUS_LABEL: Record<string, string> = {
  created: "Dibuat",
  ready: "Siap",
  testStarting: "Memulai pratinjau",
  testing: "Pratinjau",
  liveStarting: "Memulai live",
  live: "Sedang live",
  complete: "Selesai",
  revoked: "Dibatalkan",
};

function toLocalInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatSchedule(value?: string) {
  if (!value) return "Jadwal belum tersedia";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
    timeZoneName: "short",
  }).format(new Date(value));
}

function statusTone(value?: string): "success" | "warning" | "muted" {
  if (value === "live") return "success";
  if (value === "testing" || value === "testStarting" || value === "liveStarting") return "warning";
  return "muted";
}

function formFromBroadcast(broadcast: Broadcast): BroadcastForm {
  return {
    title: broadcast.title,
    description: broadcast.description || "",
    startTime: toLocalInput(broadcast.scheduledStartTime),
    endTime: toLocalInput(broadcast.scheduledEndTime),
    privacy: broadcast.privacyStatus || "unlisted",
    streamId: broadcast.boundStreamId || "",
    enableAutoStart: broadcast.enableAutoStart === true,
    enableAutoStop: broadcast.enableAutoStop === true,
    enableDvr: broadcast.enableDvr !== false,
    recordFromStart: broadcast.recordFromStart !== false,
  };
}

function formPayload(form: BroadcastForm) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    scheduledStartTime: form.startTime ? new Date(form.startTime).toISOString() : "",
    scheduledEndTime: form.endTime ? new Date(form.endTime).toISOString() : "",
    privacyStatus: form.privacy,
    streamId: form.streamId,
    enableAutoStart: form.enableAutoStart,
    enableAutoStop: form.enableAutoStop,
    enableDvr: form.enableDvr,
    recordFromStart: form.recordFromStart,
  };
}

function FormFields({ form, setForm, streams, lockedSchedule = false }: {
  form: BroadcastForm;
  setForm: (next: BroadcastForm) => void;
  streams: Stream[];
  lockedSchedule?: boolean;
}) {
  const update = <K extends keyof BroadcastForm>(key: K, value: BroadcastForm[K]) => setForm({ ...form, [key]: value });
  return <div className="space-y-4">
    <Field label="Judul tayangan"><Input value={form.title} maxLength={100} onChange={event => update("title", event.target.value)} placeholder="Contoh: Gaul Waktu Setempat | Gaul FM – The Best Visual Radio Station" /></Field>
    <Field label="Deskripsi"><Textarea value={form.description} maxLength={5000} onChange={event => update("description", event.target.value)} placeholder="Contoh: Gaul Waktu Setempat | Gaul FM – The Best Visual Radio Station&#10;Website: https://radiogaulfmsmg.com" /></Field>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Mulai (waktu perangkat)"><Input type="datetime-local" disabled={lockedSchedule} value={form.startTime} onChange={event => update("startTime", event.target.value)} /></Field>
      <Field label="Selesai (opsional)"><Input type="datetime-local" disabled={lockedSchedule} value={form.endTime} onChange={event => update("endTime", event.target.value)} /></Field>
      <Field label="Visibilitas"><Select value={form.privacy} onChange={event => update("privacy", event.target.value)}><option value="unlisted">Tidak Publik</option><option value="private">Pribadi</option><option value="public">Publik</option></Select></Field>
      <Field label="Sumber stream YouTube"><Select disabled={lockedSchedule} value={form.streamId} onChange={event => update("streamId", event.target.value)}><option value="">Pilih jalur siaran</option>{streams.map(stream => <option key={stream.id} value={stream.id}>{stream.title.replace(/stream\s*key/gi, "Siaran").trim()} {stream.title.toLowerCase().includes("default") ? "(Utama)" : ""}{stream.streamStatus === "active" ? " · menerima video" : ""}</option>)}</Select></Field>
    </div>
    {!lockedSchedule && <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
      {([
        ["enableAutoStart", "Mulai otomatis saat video masuk"],
        ["enableAutoStop", "Berhenti otomatis saat video putus"],
        ["enableDvr", "Aktifkan DVR / mundur tayangan"],
        ["recordFromStart", "Rekam dari awal siaran"],
      ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={form[key]} onChange={event => update(key, event.target.checked)} />{label}</label>)}
    </div>}
  </div>;
}

export function YouTubeAccountManager({
  onStatusLoaded,
  onSelectStreamKey,
}: {
  onStatusLoaded?: (data: {
    connected: boolean;
    channelTitle?: string;
    streams: Stream[];
    broadcasts?: Broadcast[];
  }) => void;
  onSelectStreamKey?: (streamKey: string, streamTitle: string) => void;
} = {}) {
  const toast = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Broadcast | null>(null);
  const [form, setForm] = useState<BroadcastForm>(EMPTY_FORM);
  const [transitioning, setTransitioning] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/youtube/status", { cache: "no-store", signal: AbortSignal.timeout(15_000) });
      const data = await response.json() as Status;
      setStatus(data);
      if (onStatusLoaded) {
        onStatusLoaded({
          connected: data.connected,
          channelTitle: data.channel?.title,
          streams: data.streams || [],
          broadcasts: data.broadcasts || [],
        });
      }
      if (!response.ok) throw new Error(data.error || "Status YouTube gagal dimuat.");
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "YouTube API gagal.", "error");
    } finally { setLoading(false); }
  }, [toast, onStatusLoaded]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(initial);
  }, [refresh]);

  const streams = useMemo(() => status?.streams || [], [status?.streams]);
  const activeStreamCount = streams.filter(stream => stream.streamStatus === "active").length;

  const openCreate = () => {
    const firstStream = streams.find(stream => stream.streamStatus === "active") || streams[0];
    const defaultTitle = "Gaul Waktu Setempat | Gaul FM – The Best Visual Radio Station";
    const defaultDesc = "Gaul Waktu Setempat | Gaul FM – The Best Visual Radio Station\nWebsite: https://radiogaulfmsmg.com";
    setForm({
      ...EMPTY_FORM,
      title: defaultTitle,
      description: defaultDesc,
      privacy: "public",
      streamId: firstStream?.id || "",
    });
    setCreateOpen(true);
  };

  const saveBroadcast = async (broadcast?: Broadcast) => {
    setSaving(true);
    try {
      const response = await fetch("/api/youtube/broadcasts", {
        method: broadcast ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(broadcast ? { id: broadcast.id } : {}), ...formPayload(form) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan siaran.");
      toast.push(broadcast ? "Detail siaran YouTube diperbarui." : "Siaran YouTube dibuat dan dihubungkan ke stream.");
      setCreateOpen(false);
      setEditing(null);
      await refresh();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal menyimpan siaran.", "error");
    } finally { setSaving(false); }
  };

  const transition = async (broadcast: Broadcast, action: "testing" | "live" | "complete") => {
    const wording = action === "complete" ? "mengakhiri" : action === "live" ? "menayangkan ke publik sesuai visibilitas" : "memulai pratinjau";
    if (!window.confirm(`Yakin ingin ${wording} siaran “${broadcast.title}”?`)) return;
    setTransitioning(`${broadcast.id}:${action}`);
    try {
      const response = await fetch("/api/youtube/transition", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: broadcast.id, action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Perubahan status siaran gagal.");
      toast.push(action === "complete" ? "Siaran YouTube diakhiri." : action === "live" ? "Siaran YouTube mulai live." : "Pratinjau YouTube dimulai.");
      await refresh();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Perubahan status siaran gagal.", "error");
    } finally { setTransitioning(null); }
  };

  const disconnect = async () => {
    if (!window.confirm("Putuskan akun YouTube dari panel ini? Token server akan dihapus dan akses Google akan dicabut.")) return;
    const response = await fetch("/api/youtube/oauth/disconnect", { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return toast.push(data.error || "Gagal memutuskan akun YouTube.", "error");
    setStatus({ configured: true, connected: false });
    toast.push(data.revoked ? "Akun YouTube diputus dan akses Google dicabut." : "Token lokal dihapus. Periksa akses aplikasi di akun Google bila perlu.");
  };

  if (!status) return <div className="text-xs text-muted-foreground p-4">Memeriksa koneksi akun YouTube...</div>;
  if (!status.configured) return <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm"><p className="font-semibold">OAuth YouTube belum dikonfigurasi di server</p><p className="mt-1 text-xs text-muted-foreground">Siapkan HTTPS, OAuth Client Google, redirect URI, dan encryption key.</p></div>;
  if (!status.connected) return <div className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="font-semibold text-sm">Hubungkan channel YouTube</p><p className="text-xs text-muted-foreground mt-1 mb-3">Google akan meminta izin mengelola siaran. Token disimpan terenkripsi di server.</p><Button variant="primary" onClick={() => { window.location.href = "/api/youtube/oauth/start"; }}><Link2 className="h-4 w-4 mr-2" />Hubungkan Akun YouTube</Button></div>;

  return (
    <div className="space-y-4">
      {/* Header Channel Card */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            {status.channel?.thumbnail ? (
              <div
                aria-hidden
                className="h-10 w-10 rounded-full bg-cover bg-center border border-border shrink-0"
                style={{ backgroundImage: `url(${status.channel.thumbnail})` }}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-live/10 shrink-0">
                <Radio className="h-5 w-5 text-live" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">
                {status.channel?.title || "Channel YouTube"}
              </p>
              <p className="text-xs text-muted-foreground">
                OAuth aktif · {activeStreamCount ? `${activeStreamCount} stream menerima video` : "belum ada video masuk"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">Terhubung</Badge>
            <Button variant="ghost" size="sm" disabled={loading} onClick={() => void refresh()}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
            <Button variant="danger" size="sm" onClick={() => void disconnect()}>
              <Unplug className="h-3.5 w-3.5 mr-1" />
              Putuskan
            </Button>
          </div>
        </div>

        {/* Info Sinyal YouTube Active */}
        {streams.some((stream) => stream.streamStatus === "active") && (
          <div className="rounded-lg border border-success/30 bg-success/10 p-3">
            <p className="text-xs font-semibold text-success flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> Video dari server diterima YouTube
            </p>
            {streams
              .filter((stream) => stream.streamStatus === "active")
              .map((stream) => (
                <p key={stream.id} className="mt-1 text-[11px] text-muted-foreground">
                  {stream.title} · kesehatan {stream.healthStatus || "belum tersedia"}
                  {stream.issues?.length ? ` · ${stream.issues.length} peringatan` : ""}
                </p>
              ))}
          </div>
        )}

        {/* Ringkasan Jalur Stream Channel YouTube */}
        <div className="rounded-lg border border-border/70 bg-muted/20 p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Radio className="h-4 w-4 text-live" />
            <div>
              <p className="font-semibold text-foreground">Integrasi Siaran YouTube</p>
              <p className="text-[11px] text-muted-foreground">
                {streams.length} jalur siaran terhubung otomatis ke transmisi studio.
              </p>
            </div>
          </div>
          <Badge tone="success" className="text-[10px]">
            Siap Mengudara
          </Badge>
        </div>
      </div>

      {/* Siaran Aktif & Mendatang Card */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Siaran Aktif dan Mendatang
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Judul, jadwal, privasi, sumber video, dan status live dikelola dari sini.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Buat Siaran
          </Button>
        </div>

        {!status.broadcasts?.length && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <CalendarClock className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Belum ada siaran aktif atau mendatang</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Buat jadwal baru untuk menyiapkan halaman live YouTube.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {status.broadcasts?.map((broadcast) => {
            const stream = streams.find((item) => item.id === broadcast.boundStreamId);
            const isLive = broadcast.lifeCycleStatus === "live";
            const isTesting = broadcast.lifeCycleStatus === "testing" || broadcast.lifeCycleStatus === "testStarting";
            const canStart = !isLive && broadcast.lifeCycleStatus !== "complete";
            return (
              <div key={broadcast.id} className="rounded-lg bg-muted/30 border border-border/60 p-3">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{broadcast.title}</p>
                      <Badge tone={statusTone(broadcast.lifeCycleStatus)}>
                        {STATUS_LABEL[broadcast.lifeCycleStatus || ""] || broadcast.lifeCycleStatus || "Status tidak diketahui"}
                      </Badge>
                      <Badge>
                        {broadcast.privacyStatus === "public" ? "Publik" : broadcast.privacyStatus === "private" ? "Pribadi" : "Tidak Publik"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatSchedule(broadcast.scheduledStartTime)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {stream ? `${stream.title} · ${stream.streamStatus === "active" ? "video masuk" : "menunggu video"}` : "Belum terhubung ke stream"} · {broadcast.enableAutoStart ? "Auto-start" : "Start manual"} · {broadcast.enableAutoStop ? "Auto-stop" : "Stop manual"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(broadcast);
                        setForm(formFromBroadcast(broadcast));
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    {canStart && broadcast.monitorStreamEnabled && !isTesting && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!transitioning}
                        onClick={() => void transition(broadcast, "testing")}
                      >
                        <Play className="h-3.5 w-3.5 mr-1" />
                        Pratinjau
                      </Button>
                    )}
                    {canStart && (
                      <Button
                        variant="live"
                        size="sm"
                        disabled={!!transitioning}
                        onClick={() => void transition(broadcast, "live")}
                      >
                        <Radio className="h-3.5 w-3.5 mr-1" />
                        Go Live
                      </Button>
                    )}
                    {(isLive || isTesting) && (
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={!!transitioning}
                        onClick={() => void transition(broadcast, "complete")}
                      >
                        <CircleStop className="h-3.5 w-3.5 mr-1" />
                        Akhiri
                      </Button>
                    )}
                    <a
                      className="inline-flex h-8 items-center px-2.5 text-xs font-medium text-brand hover:underline rounded-md hover:bg-brand/10 transition-colors"
                      target="_blank"
                      rel="noreferrer"
                      href={`https://www.youtube.com/watch?v=${broadcast.id}`}
                    >
                      Buka
                      <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Buat siaran YouTube" description="Siapkan halaman tayangan dan hubungkan ke sumber video server." wide>
        <FormFields form={form} setForm={setForm} streams={streams} />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>Batal</Button>
          <Button variant="primary" disabled={saving || !form.title.trim() || !form.startTime || !form.streamId} onClick={() => void saveBroadcast()}>
            <Plus className="h-4 w-4 mr-1" />
            {saving ? "Membuat..." : "Buat Siaran"}
          </Button>
        </div>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Kelola detail siaran" description={editing?.lifeCycleStatus === "live" ? "Saat live, jadwal dan sumber stream dikunci oleh YouTube." : "Perubahan disimpan langsung ke YouTube."} wide>
        {editing && (
          <>
            <FormFields form={form} setForm={setForm} streams={streams} lockedSchedule={editing.lifeCycleStatus === "live"} />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
              <Button variant="primary" disabled={saving || !form.title.trim() || !form.startTime} onClick={() => void saveBroadcast(editing)}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Menyimpan..." : "Simpan ke YouTube"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
