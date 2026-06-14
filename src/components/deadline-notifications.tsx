"use client";

import { cn, formatDateTime } from "@/lib/utils";
import { PHASE_LABELS, type Phase } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/countdown";

export interface DeadlineItem {
  phase: Phase;
  lockAt: string;
  locked: boolean;
  isOpen: boolean;
}

const ACT_SOON_MS = 14 * 24 * 60 * 60 * 1000;

function DeadlineRow({
  d,
  variant,
}: {
  d: DeadlineItem;
  variant: "done" | "active" | "later";
}) {
  const locked = variant === "done" || d.locked || new Date(d.lockAt).getTime() <= Date.now();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5",
        variant === "done" && "border-white/5 bg-white/[0.02] opacity-75",
        variant === "active" && "border-amber-500/40 bg-amber-500/10",
        variant === "later" && "border-white/10 bg-white/[0.02]",
      )}
    >
      <div>
        <div className="text-sm font-semibold text-white">{PHASE_LABELS[d.phase]}</div>
        <div className="text-xs text-navy-400">{formatDateTime(d.lockAt)}</div>
      </div>
      <div className="text-right">
        {locked ? (
          <Badge variant="muted">Completed</Badge>
        ) : (
          <>
            <Countdown
              target={d.lockAt}
              mode="days"
              prefix="in "
              className={cn(
                "text-base font-bold",
                variant === "active" ? "text-amber-200" : "text-pitch-300",
              )}
            />
            {variant === "active" && (
              <div className="text-[10px] font-semibold uppercase text-amber-400/90">Act next</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  variant,
  empty,
}: {
  title: string;
  items: DeadlineItem[];
  variant: "done" | "active" | "later";
  empty?: string;
}) {
  if (items.length === 0 && !empty) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-navy-400">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-navy-500">{empty}</p>
      ) : (
        items.map((d) => <DeadlineRow key={d.phase} d={d} variant={variant} />)
      )}
    </div>
  );
}

export function DeadlineNotifications({ deadlines }: { deadlines: DeadlineItem[] }) {
  const now = Date.now();

  const completed = deadlines
    .filter((d) => d.locked || new Date(d.lockAt).getTime() <= now)
    .sort((a, b) => new Date(b.lockAt).getTime() - new Date(a.lockAt).getTime());

  const upcoming = deadlines
    .filter((d) => d.isOpen && !d.locked && new Date(d.lockAt).getTime() > now)
    .sort((a, b) => new Date(a.lockAt).getTime() - new Date(b.lockAt).getTime());

  const actNext = upcoming.filter((d) => new Date(d.lockAt).getTime() - now <= ACT_SOON_MS);
  const notStarted = upcoming.filter((d) => new Date(d.lockAt).getTime() - now > ACT_SOON_MS);

  const next = upcoming[0];

  if (deadlines.length === 0) {
    return (
      <Card className="border-white/10">
        <CardContent className="py-6 text-center text-sm text-navy-300">No phase deadlines configured.</CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(actNext.length > 0 && "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent")}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">⏰ Deadlines</CardTitle>
          {next && (
            <Badge variant={actNext.length > 0 ? "warning" : "info"}>
              Next:{" "}
              <Countdown target={next.lockAt} prefix="in " className="inline text-inherit" />
            </Badge>
          )}
        </div>
        <p className="text-xs text-navy-400">Asia/Yerevan · live countdown</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <Section title="✅ Completed" items={completed} variant="done" empty="Nothing completed yet." />
        <Section title="⚡ Act next" items={actNext} variant="active" empty="No urgent deadlines right now." />
        <Section title="📅 Coming up" items={notStarted} variant="later" empty="No later deadlines." />
      </CardContent>
    </Card>
  );
}
