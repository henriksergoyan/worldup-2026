"use client";

import { cn, formatDateTime, relativeTime } from "@/lib/utils";
import { PHASE_LABELS, type Phase } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface DeadlineItem {
  phase: Phase;
  lockAt: string;
  locked: boolean;
  isOpen: boolean;
}

export function DeadlineNotifications({ deadlines }: { deadlines: DeadlineItem[] }) {
  const now = Date.now();
  const upcoming = deadlines
    .filter((d) => d.isOpen && d.lockAt && new Date(d.lockAt).getTime() > now)
    .sort((a, b) => new Date(a.lockAt).getTime() - new Date(b.lockAt).getTime());

  const urgent = upcoming.filter((d) => new Date(d.lockAt).getTime() - now < 48 * 60 * 60 * 1000);
  const next = upcoming[0];

  if (upcoming.length === 0) {
    return (
      <Card className="border-white/10">
        <CardContent className="py-6 text-center text-sm text-navy-300">
          No upcoming phase deadlines — check kickoff locks on individual matches.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(urgent.length > 0 && "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent")}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">⏰ Upcoming deadlines</CardTitle>
          {next && (
            <Badge variant={urgent.length > 0 ? "warning" : "info"}>
              Next: {relativeTime(next.lockAt)}
            </Badge>
          )}
        </div>
        <p className="text-xs text-navy-400">
          From the league ToR spreadsheet · times in Asia/Yerevan
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.map((d) => {
          const ms = new Date(d.lockAt).getTime() - now;
          const isUrgent = ms < 48 * 60 * 60 * 1000;
          const isSoon = ms < 7 * 24 * 60 * 60 * 1000;
          return (
            <div
              key={d.phase}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5",
                isUrgent
                  ? "border-amber-500/40 bg-amber-500/10"
                  : isSoon
                    ? "border-pitch-500/25 bg-pitch-500/5"
                    : "border-white/10 bg-white/[0.02]",
              )}
            >
              <div>
                <div className="text-sm font-semibold text-white">{PHASE_LABELS[d.phase]}</div>
                <div className="text-xs text-navy-400">{formatDateTime(d.lockAt)}</div>
              </div>
              <div className="text-right">
                <div className={cn("text-sm font-bold tabular-nums", isUrgent ? "text-amber-200" : "text-pitch-300")}>
                  {relativeTime(d.lockAt)}
                </div>
                {isUrgent && <div className="text-[10px] font-semibold uppercase text-amber-400/90">Act now</div>}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
