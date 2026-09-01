"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { useAdminStore } from "@/hooks/useAdminStore";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, formatRelative } from "@/lib/utils";

export default function UsersPage() {
  const { profiles, sheetsSyncStatus } = useAdminStore();
  const toast = useToast();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return profiles;
    return profiles.filter((u) =>
      [u.full_name, u.email, u.whatsapp, u.city, u.device_os, u.device_model]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [profiles, q]);

  const exportToExcel = () => {
    const rows = filtered.map((u) => ({
      full_name: u.full_name,
      email: u.email,
      whatsapp: u.whatsapp,
      device_os: u.device_os,
      device_model: u.device_model,
      city: u.city,
      latitude: u.latitude,
      longitude: u.longitude,
      push_token: u.push_token ? "yes" : "no",
      last_login: u.last_login,
      created_at: u.created_at,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Listeners");
    XLSX.writeFile(wb, "gaulfm_listeners.xlsx");
    toast.push(`Export ${rows.length} baris ke Excel`);
  };

  const byOs = profiles.reduce<Record<string, number>>((acc, u) => {
    const k = u.device_os || "Unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Listeners & Marketing"
        description="Data pendengar terdaftar — export Excel & status sync Google Sheets (PRD §4.1 D)."
        actions={
          <Button onClick={exportToExcel} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" />
            Export Listener Data (.xlsx)
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Total listeners
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">
              {profiles.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Google Sheets
            </p>
            <div className="mt-2">
              <Badge
                tone={sheetsSyncStatus === "ok" ? "success" : "orange"}
                pulse={sheetsSyncStatus === "ok"}
              >
                {sheetsSyncStatus === "ok" ? "Sync OK" : sheetsSyncStatus}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Webhook → /api/sync-sheets (nanti)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Device mix
            </p>
            <div className="mt-2 flex-wrap gap-1.5">
              {Object.entries(byOs).map(([os, n]) => (
                <Badge key={os} tone="muted">
                  {os} {n}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Tabel pendengar</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama, email, kota…"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-y border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Kontak</th>
                <th className="px-4 py-3 font-semibold">Device</th>
                <th className="px-4 py-3 font-semibold">Lokasi</th>
                <th className="px-4 py-3 font-semibold">Last login</th>
                <th className="px-4 py-3 font-semibold">Push</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{u.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        join {formatDateTime(u.created_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{u.email ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.whatsapp ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="muted">{u.device_os ?? "—"}</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {u.device_model ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.city ?? "—"}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {u.latitude != null && u.longitude != null
                          ? `${u.latitude.toFixed(3)}, ${u.longitude.toFixed(3)}`
                          : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatRelative(u.last_login)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.push_token ? "success" : "muted"}>
                        {u.push_token ? "On" : "Off"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
