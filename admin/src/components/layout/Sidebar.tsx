"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  Radio,
  Users,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navigation = [
  {
    section: null,
    items: [{ name: "Overview", href: "/", icon: LayoutDashboard }],
  },
  {
    section: "Siaran",
    items: [
      { name: "Now Playing", href: "/now-playing", icon: Radio },
      { name: "Live Chat", href: "/chat", icon: MessageSquare },
      { name: "Streaming", href: "/streams", icon: Video },
    ],
  },
  {
    section: "Konten",
    items: [
      { name: "Jadwal Siaran", href: "/schedule", icon: CalendarDays },
      { name: "Berita", href: "/news", icon: Newspaper },
      { name: "Banner", href: "/banners", icon: ImageIcon },
    ],
  },
  {
    section: "Data",
    items: [{ name: "Pendengar", href: "/users", icon: Users }],
  },
] as const;

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  const content = (
    <>
      <div className="flex flex-1 flex-col overflow-y-auto p-3">
        {/* Brand lockup */}
        <div className="mb-5 flex items-center gap-2.5 px-2 pt-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand font-black text-brand-foreground">
            G
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Gaul FM
            </p>
            <p className="text-[11px] text-sidebar-muted">Admin Console</p>
          </div>
        </div>

        <nav className="space-y-4">
          {navigation.map((group, i) => (
            <div key={group.section ?? `group-${i}`}>
              {group.section ? (
                <p className="mb-1.5 px-3 text-[11px] font-medium text-sidebar-muted">
                  {group.section}
                </p>
              ) : null}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-active-soft text-sidebar-active"
                          : "text-sidebar-muted hover:bg-sidebar-active-soft/40 hover:text-sidebar-foreground",
                      )}
                    >
                      {active ? (
                        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-active" />
                      ) : null}
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer / status */}
      <div className="space-y-3 border-t border-sidebar-border p-3">
        <ThemeToggle />
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] text-sidebar-muted">Data mode</span>
          <Badge tone={isSupabaseConfigured ? "success" : "accent"}>
            {isSupabaseConfigured ? "Supabase" : "Demo"}
          </Badge>
        </div>
        {!isSupabaseConfigured ? (
          <p className="px-1 text-[11px] leading-relaxed text-sidebar-muted">
            87.8 FM Semarang · data demo tersimpan lokal. Hubungkan Supabase
            untuk data live.
          </p>
        ) : null}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden h-full w-60 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar md:flex">
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={onClose}
          />
          <aside className="relative flex h-full w-72 flex-col justify-between border-r border-sidebar-border bg-sidebar shadow-2xl">
            {content}
          </aside>
        </div>
      ) : null}
    </>
  );
}
