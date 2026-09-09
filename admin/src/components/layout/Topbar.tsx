"use client";

import { useSyncExternalStore } from "react";
import { Menu, Radio } from "lucide-react";
import { useAdminStore } from "@/hooks/useAdminStore";
import { formatRelative } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

/** Current epoch ms — captured once per subscription, null on server. */
let nowCache: number | null = null;
function getNowSnapshot(): number | null {
  if (nowCache == null) nowCache = Date.now();
  return nowCache;
}
function getNowServerSnapshot(): number | null {
  return null;
}

function useNow(): number | null {
  return useSyncExternalStore(
    emptySubscribe,
    getNowSnapshot,
    getNowServerSnapshot,
  );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { nowPlaying } = useAdminStore();
  const now = useNow();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Badge tone="live" pulse>
          On air
        </Badge>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">
            {nowPlaying.current_program}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {nowPlaying.current_host}
            {now != null
              ? ` · diperbarui ${formatRelative(nowPlaying.updated_at, now)}`
              : ""}
          </p>
        </div>
      </div>

      <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
        <Radio className="h-3.5 w-3.5 text-brand" />
        Studio control
      </div>
    </header>
  );
}
