"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import type { RankOutlookSummary, UpcomingMatchOutlook } from "@/lib/rank-analytics";

export function RankOutlookPanel({
  summary,
  upcoming,
  userName,
}: {
  summary: RankOutlookSummary;
  upcoming: UpcomingMatchOutlook[];
  userName: string;
}) {
  const rankGainBest = summary.currentRank - summary.bestRank;
  const rankDropWorst = summary.worstRank - summary.currentRank;

  return (
    <div className="space-y-4">
      <Card className="border-sky-500/25 bg-gradient-to-br from-sky-500/8 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">📈 Դիրքի սցենարներ — {userName}</CardTitle>
          <p className="text-xs text-navy-400">
            Հաշվարկված է մնացած {summary.pendingMatches} խաղ(եր)ի համար՝ հիմնվելով կանխատեսումների վրա
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <ScenarioBox
              label="Ընթացիկ"
              rank={summary.currentRank}
              points={summary.currentPoints}
              variant="default"
            />
            <ScenarioBox
              label="Լավագույն դեպք"
              rank={summary.bestRank}
              points={summary.bestPoints}
              variant="best"
              delta={
                rankGainBest > 0 ? (
                  <span className="text-pitch-300">↑ {rankGainBest} տեղ</span>
                ) : (
                  <span className="text-navy-400">առանց փոփոխության</span>
                )
              }
            />
            <ScenarioBox
              label="Վատագույն դեպք"
              rank={summary.worstRank}
              points={summary.worstPoints}
              variant="worst"
              delta={
                rankDropWorst > 0 ? (
                  <span className="text-red-300">↓ {rankDropWorst} տեղ</span>
                ) : (
                  <span className="text-navy-400">առանց փոփոխության</span>
                )
              }
            />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-navy-500">
            Լավագույն՝ ձեր կանխատեսումները իրականանում են, մյուսները միավոր են ստանում այդ արդյունքներով։
            Վատագույն՝ դուք 0 միավոր եք ստանում, մյուսները՝ իրենց կանխատեսումներով առավելագույնը։
          </p>
        </CardContent>
      </Card>

      {upcoming.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">🎯 Գալիք խաղեր՝ խաղային ազդեցություն</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.slice(0, 8).map((m) => {
              const gain = summary.currentRank - m.rankIfHits;
              const drop = m.rankIfMisses - summary.currentRank;
              return (
                <div
                  key={m.matchId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{m.label}</div>
                    <div className="text-xs text-navy-400">
                      {formatDateTime(m.scheduledAt)} · Կանխատեսում՝ {m.prediction}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="success">✓ #{m.rankIfHits}{gain > 0 ? ` (+${gain})` : ""}</Badge>
                    <Badge variant="muted" className="border-red-500/30 bg-red-500/10 text-red-300">
                      ✗ #{m.rankIfMisses}{drop > 0 ? ` (−${drop})` : ""}
                    </Badge>
                    <span className="text-xs font-bold tabular-nums text-pitch-300">+{m.maxPoints} մվ</span>
                  </div>
                </div>
              );
            })}
            {upcoming.length > 8 && (
              <p className="text-center text-xs text-navy-500">+{upcoming.length - 8} այլ խաղ</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScenarioBox({
  label,
  rank,
  points,
  variant,
  delta,
}: {
  label: string;
  rank: number;
  points: number;
  variant: "default" | "best" | "worst";
  delta?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        variant === "best" && "border-pitch-500/30 bg-pitch-500/10",
        variant === "worst" && "border-red-500/25 bg-red-500/8",
        variant === "default" && "border-white/10 bg-white/[0.02]",
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-wide text-navy-400">{label}</div>
      <div className="mt-1 text-2xl font-black text-white">#{rank}</div>
      <div className="text-xs tabular-nums text-navy-300">{points} միավոր</div>
      {delta && <div className="mt-1 text-xs font-semibold">{delta}</div>}
    </div>
  );
}

export function AdminMemberLink({ userId, name }: { userId: string; name: string }) {
  return (
    <Link
      href={`/admin/members/${userId}`}
      className="font-semibold text-pitch-300 transition hover:text-pitch-200 hover:underline"
    >
      {name}
    </Link>
  );
}
