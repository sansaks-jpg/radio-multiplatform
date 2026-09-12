"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Search, Smartphone, Users } from "lucide-react";
import * as XLSX from "xlsx";
import { useAdminStore } from "@/hooks/useAdminStore";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, formatRelative, formatDeviceOs } from "@/lib/utils";

export default function UsersPage() {
  const { profiles, sheetsSyncStatus } = useAdminStore();
  const toast = useToast();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return profiles;
    return profiles.filter((u) =>
      [
        u.full_name,
        u.email,
        u.whatsapp,
        u.city,
        u.device_os,
        formatDeviceOs(u.device_os),
        u.device_model,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [profiles, q]);

  const exportToExcel = () => {
    const rows = filtered.map((u) => ({
      full_name: u.full_name,
      email: u.email,
      whatsapp: u.whatsapp,
      device_os: formatDeviceOs(u.device_os),
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
    toast.push(`Export ${rows.length} baris ke Excel berhasil`);
  };

  const byOs = profiles.reduce<Record<string, number>>((acc, u) => {
    const k = formatDeviceOs(u.device_os);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const deviceHint = Object.entries(byOs)
    .map(([os, n]) => `${os} (${n})`)
    .join(" · ") || "Belum ada data";

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        title="Data Pendengar"
        badge={<Badge tone="brand">Marketing & CRM</Badge>}
        description="Daftar pendengar terdaftar aplikasi mobile, analitik sebaran perangkat, dan ekspor spreadsheet."
        actions={
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5" />
            <span>Export Excel (.xlsx)</span>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total pendengar"
          value={`${profiles.length} akun`}
          hint="Terdaftar via aplikasi mobile"
          tone="brand"
          icon={<Users className="h-4.5 w-4.5" />}
        />
        <StatCard
          label="Google Sheets"
          value={sheetsSyncStatus === "ok" ? "Tersinkron" : "Standby"}
          hint={sheetsSyncStatus === "ok" ? "Sync otomatis aktif" : "Mode lokal studio"}
          tone="accent"
          icon={<FileSpreadsheet className="h-4.5 w-4.5" />}
        />
        <StatCard
          label="Sebaran perangkat"
          value={`${Object.keys(byOs).length} platform`}
          hint={deviceHint}
          tone="default"
          icon={<Smartphone className="h-4.5 w-4.5" />}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3">
          <CardTitle>Tabel Pendengar</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama, email, kota…"
              className="pl-9 h-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama & Waktu</th>
                <th className="px-4 py-3 font-semibold">Kontak</th>
                <th className="px-4 py-3 font-semibold">Perangkat</th>
                <th className="px-4 py-3 font-semibold">Lokasi</th>
                <th className="px-4 py-3 font-semibold">Terakhir Aktif</th>
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
                        gabung {formatDateTime(u.created_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{u.email ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.whatsapp ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="muted">{formatDeviceOs(u.device_os)}</Badge>
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
                        {u.push_token ? "Aktif" : "Nonaktif"}
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
