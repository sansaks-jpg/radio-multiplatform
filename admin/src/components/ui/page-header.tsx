import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "default" | "brand" | "orange" | "live";
}) {
  const iconBg =
    tone === "brand"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
      : tone === "orange"
        ? "bg-orange-50 text-orange-700 border border-orange-200/80"
        : tone === "live"
          ? "bg-red-50 text-red-700 border border-red-200/80"
          : "bg-slate-100 text-slate-700 border border-slate-200/80";

  const accentBorder =
    tone === "brand"
      ? "border-l-4 border-l-brand"
      : tone === "orange"
        ? "border-l-4 border-l-orange"
        : tone === "live"
          ? "border-l-4 border-l-live"
          : "border-l-4 border-l-slate-300";

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 transition-all hover:shadow-sm hover:border-border/80",
        accentBorder,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 truncate text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-xs", iconBg)}>
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-dashed border-border bg-muted/30 px-6 py-14 text-center">
      <p className="text-sm font-bold">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
