import { cn } from "@/lib/utils";
import type { CompletionStatus } from "@/lib/deadline-completion";

const STATUS_STYLES: Record<CompletionStatus, { wrap: string; bar: string; text: string }> = {
  complete: {
    wrap: "border-emerald-500/30 bg-emerald-500/10",
    bar: "bg-emerald-500",
    text: "text-emerald-200",
  },
  partial: {
    wrap: "border-amber-500/35 bg-amber-500/10",
    bar: "bg-amber-400",
    text: "text-amber-200",
  },
  none: {
    wrap: "border-red-500/35 bg-red-500/10",
    bar: "bg-red-500",
    text: "text-red-200",
  },
};

export function DeadlineCompletionBadge({
  filled,
  total,
  status,
  compact = false,
}: {
  filled: number;
  total: number;
  status: CompletionStatus;
  compact?: boolean;
}) {
  const style = STATUS_STYLES[status];
  const pct = total > 0 ? Math.round((filled / total) * 100) : 100;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums",
          style.wrap,
          style.text,
        )}
        title={`${filled}/${total}`}
      >
        <span className={cn("h-2 w-2 rounded-full", style.bar)} />
        {filled}/{total}
      </span>
    );
  }

  return (
    <div className={cn("inline-flex min-w-[72px] flex-col items-end gap-1 rounded-lg border px-2 py-1", style.wrap)}>
      <span className={cn("text-xs font-bold tabular-nums", style.text)}>
        {filled}/{total}
      </span>
      <div className="h-1 w-14 overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full", style.bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
