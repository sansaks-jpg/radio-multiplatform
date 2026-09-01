import { cn } from "@/lib/utils";

type Tone = "default" | "brand" | "orange" | "live" | "success" | "muted";

const tones: Record<Tone, string> = {
  default: "bg-muted text-foreground",
  brand: "bg-brand/15 text-brand",
  orange: "bg-orange/15 text-orange",
  live: "bg-live/15 text-live",
  success: "bg-success/15 text-success",
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]",
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
