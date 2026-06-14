import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "gold" | "muted";

const variants: Record<BadgeVariant, string> = {
  default: "bg-white/10 text-navy-100 border-white/15",
  success: "bg-pitch-500/20 text-pitch-200 border-pitch-500/30",
  warning: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  danger: "bg-red-500/15 text-red-200 border-red-500/30",
  info: "bg-sky-500/15 text-sky-200 border-sky-500/30",
  gold: "bg-gold-500/20 text-gold-400 border-gold-500/40",
  muted: "bg-navy-800/60 text-navy-300 border-white/5",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
