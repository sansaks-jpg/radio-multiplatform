import { cn } from "@/lib/utils";

type Tone =
  | "default"
  | "brand"
  | "accent"
  | "live"
  | "success"
  | "warning"
  | "danger"
  | "orange"
  | "muted";

const tones: Record<Tone, string> = {
  default: "bg-muted text-foreground",
  brand: "bg-brand-soft text-brand",
  accent: "bg-accent-soft text-accent",
  live: "bg-live-soft text-live",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  orange: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30",
  muted: "bg-muted text-muted-foreground",
};

export function Badge({
  children,
  tone = "default",
  className,
  pulse,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {pulse ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {children}
    </span>
  );
}
