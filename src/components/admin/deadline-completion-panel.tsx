import Link from "next/link";
import { cn, formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/countdown";
import type { CompletionStatus, DeadlineCompletionReport } from "@/lib/deadline-completion";

const STATUS_STYLES: Record<
  CompletionStatus,
  { row: string; dot: string; bar: string; label: string; badge: "success" | "warning" | "danger" }
> = {
  complete: {
    row: "border-emerald-500/25 bg-emerald-500/[0.06]",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    label: "Ավարտված",
    badge: "success",
  },
  partial: {
    row: "border-amber-500/35 bg-amber-500/[0.08]",
    dot: "bg-amber-400",
    bar: "bg-amber-400",
    label: "Ընթացքի մեջ",
    badge: "warning",
  },
  none: {
    row: "border-red-500/35 bg-red-500/[0.08]",
    dot: "bg-red-500",
    bar: "bg-red-500",
    label: "Չի սկսել",
    badge: "danger",
  },
};

export function DeadlineCompletionPanel({ report }: { report: DeadlineCompletionReport }) {
  if (!report.phase || !report.lockAt) {
    return (
      <Card className="border-white/10">
        <CardContent className="py-8 text-center text-sm text-navy-300">
          Սպասվող վերջնաժամկետ չկա — բոլոր փուլերը փակված են կամ ժամանակը դեռ սահմանված չէ։
        </CardContent>
      </Card>
    );
  }

  const incomplete = report.players.filter((p) => p.status !== "complete");
  const completeCount = report.players.length - incomplete.length;

  return (
    <Card className="overflow-hidden border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-transparent">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <span>📋</span> Հաջորդ վերջնաժամկետ
            </CardTitle>
            <p className="mt-1 text-sm font-semibold text-white">{report.phaseLabel}</p>
            <p className="text-xs text-navy-400">{formatDateTime(report.lockAt)}</p>
          </div>
          <div className="shrink-0 text-right">
            <Badge variant="warning" className="mb-1">
              Մնաց <Countdown target={report.lockAt} mode="days" className="inline text-inherit" />
            </Badge>
            <div className="text-xs text-navy-400">
              {report.kind === "champion"
                ? "1 ընտրություն պարտադիր"
                : `${report.players[0]?.total ?? 0} խաղ պարտադիր`}
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-xs sm:flex sm:flex-wrap sm:text-left">
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-200">
            {incomplete.filter((p) => p.status === "none").length} չի սկսել
          </span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-200">
            {incomplete.filter((p) => p.status === "partial").length} ընթացքում
          </span>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
            {completeCount} ավարտված
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {report.players.length === 0 ? (
          <p className="text-sm text-navy-300">Ակտիվ մասնակիցներ չկան։</p>
        ) : report.players[0]?.total === 0 ? (
          <p className="text-sm text-navy-300">
            Այս փուլի բոլոր խաղերը արդեն փակված են կամ ավարտված — նոր կանխատեսումներ չեն պահանջվում։
          </p>
        ) : (
          report.players.map((p) => {
            const style = STATUS_STYLES[p.status];
            const pct = p.total > 0 ? Math.round((p.filled / p.total) * 100) : 100;
            return (
              <Link
                key={p.userId}
                href={`/admin/members/${p.userId}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition active:scale-[0.99] hover:brightness-110",
                  style.row,
                )}
              >
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", style.dot)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{p.name}</div>
                  <div className="mt-1 hidden text-[11px] text-navy-400 sm:block">{style.label}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs font-bold tabular-nums text-white">
                    {p.filled}/{p.total}
                  </span>
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10 sm:w-20">
                    <div className={cn("h-full rounded-full", style.bar)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <Badge variant={style.badge} className="hidden shrink-0 sm:inline-flex">
                  {style.label}
                </Badge>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
