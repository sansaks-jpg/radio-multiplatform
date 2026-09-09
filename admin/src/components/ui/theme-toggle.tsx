"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

/** True once mounted on the client — avoids hydration mismatch for next-themes. */
function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex h-8 w-full items-center gap-2 rounded-md border border-sidebar-border px-2.5 text-xs font-medium text-sidebar-muted transition-colors hover:border-sidebar-active/40 hover:text-sidebar-foreground",
        className,
      )}
      aria-label="Ganti tema tampilan"
    >
      {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      <span>{isDark ? "Dark mode" : "Light mode"}</span>
    </button>
  );
}
