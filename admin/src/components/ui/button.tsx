import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "orange"
  | "outline"
  | "live";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-foreground hover:bg-brand/90 font-semibold shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_20px_rgba(0,0,0,0.35)]",
  secondary:
    "bg-surface-2 text-foreground hover:bg-surface-3 font-medium",
  ghost: "bg-transparent text-foreground/80 hover:bg-muted hover:text-foreground font-medium",
  danger:
    "bg-danger-container text-danger hover:bg-danger-container/80 font-semibold",
  orange:
    "bg-orange-container text-white hover:bg-orange-container/90 font-semibold shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_8px_24px_rgba(220,117,33,0.25)]",
  live:
    "bg-live text-live-foreground hover:bg-live/90 font-bold uppercase tracking-wide",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-muted/60 font-medium",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-md gap-1.5",
  md: "h-10 px-4 text-sm rounded-md gap-2",
  lg: "h-11 px-5 text-sm rounded-md gap-2",
  icon: "h-10 w-10 rounded-md",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      type = "button",
      disabled,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
