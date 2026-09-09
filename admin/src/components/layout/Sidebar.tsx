"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Image as ImageIcon,
  LayoutDashboard,
  Newspaper,
  Radio,
  Users,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Now Playing", href: "/now-playing", icon: Radio },
  { name: "Streaming", href: "/streams", icon: Video },
  { name: "Schedule", href: "/schedule", icon: CalendarDays },
  { name: "News Sync", href: "/news", icon: Newspaper },
  { name: "Banners", href: "/banners", icon: ImageIcon },
  { name: "Listeners", href: "/users", icon: Users },
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
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        {/* Brand lockup */}
        <div className="mb-6 flex items-center gap-3 px-2 pt-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand font-black text-brand-foreground shadow-[0_4px_16px_rgba(120,219,148,0.25)]">
            G
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-tight text-sidebar-foreground">
              Gaul FM
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-muted">
              Admin Console
            </p>
          </div>
        </div>

        {/* Section label */}
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-muted">
          Studio
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => {
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
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-sidebar-active/15 text-sidebar-active"
                    : "text-sidebar-muted hover:bg-sidebar-border hover:text-sidebar-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active
                      ? "text-sidebar-active"
                      : "text-sidebar-muted group-hover:text-sidebar-foreground",
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / status */}
      <div className="space-y-3 border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-muted">
            Data mode
          </span>
          <Badge tone={isSupabaseConfigured ? "success" : "orange"}>
            {isSupabaseConfigured ? "Supabase" : "Demo"}
          </Badge>
        </div>

        <p className="px-1 text-[11px] leading-relaxed text-sidebar-muted">
          87.8 FM Semarang · Demo store in localStorage. Connect Supabase env
          for live data.
        </p>
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
