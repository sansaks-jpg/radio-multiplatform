import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "accent"
  | "destructive"
  | "danger"
  | "orange"
  | "live";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-foreground hover:opacity-90 font-semibold",
  secondary: "bg-surface-2 text-foreground hover:bg-surface-3 font-medium",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-muted font-medium",
  ghost:
    "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground font-medium",
  accent: "bg-accent text-accent-foreground hover:opacity-90 font-semibold",
  destructive:
    "bg-danger-soft text-danger hover:bg-danger/20 font-semibold",
  danger:
    "bg-danger-soft text-danger hover:bg-danger/20 font-semibold",
  orange:
    "bg-orange-500 text-white hover:bg-orange-600 font-semibold",
  live: "bg-live text-live-foreground hover:opacity-90 font-semibold",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-md gap-1.5",
  md: "h-9 px-4 text-sm rounded-md gap-2",
  lg: "h-11 px-5 text-sm rounded-md gap-2",
  icon: "h-9 w-9 rounded-md",
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
        "inline-flex items-center justify-center whitespace-nowrap transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
