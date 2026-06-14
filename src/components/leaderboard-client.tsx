"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatAMD } from "@/lib/utils";

export interface Row {
  userId: string;
  rank: number;
  name: string;
  totalPoints: number;
  groupStagePoints: number;
  knockoutTeamPoints: number;
  knockoutStagePoints: number;
  championPoints: number;
  exactScoreHits: number;
  complicatedExactScoreHits: number;
  correctOutcomes: number;
  prizeAmount: number;
  isMe: boolean;
}

type Tab = "overall" | "group" | "knockout" | "champion" | "prizes";

const TABS: { id: Tab; label: string }[] = [
  { id: "overall", label: "Overall" },
  { id: "group", label: "Group Stage" },
  { id: "knockout", label: "Knockout" },
  { id: "champion", label: "Champion" },
  { id: "prizes", label: "Prize Table" },
];

function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

export function LeaderboardClient({ rows, prizePool }: { rows: Row[]; prizePool: number }) {
  const [tab, setTab] = useState<Tab>("overall");

  const sorted = useMemo(() => {
    const copy = [...rows];
    if (tab === "group") copy.sort((a, b) => b.groupStagePoints - a.groupStagePoints);
    else if (tab === "knockout")
      copy.sort(
        (a, b) =>
          b.knockoutStagePoints + b.knockoutTeamPoints - (a.knockoutStagePoints + a.knockoutTeamPoints),
      );
    else if (tab === "champion") copy.sort((a, b) => b.championPoints - a.championPoints);
    return copy;
  }, [rows, tab]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition",
              tab === t.id ? "bg-pitch-500/20 text-pitch-100" : "text-navy-300 hover:bg-white/5",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "prizes" ? (
        <PrizeTable rows={rows} prizePool={prizePool} />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-navy-400">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-3 py-3 text-right">Total</th>
                    <th className="px-3 py-3 text-right">Group</th>
                    <th className="px-3 py-3 text-right">KO Teams</th>
                    <th className="px-3 py-3 text-right">KO Stage</th>
                    <th className="px-3 py-3 text-right">Champ</th>
                    <th className="px-3 py-3 text-right">Exact</th>
                    <th className="px-3 py-3 text-right">Compl.</th>
                    <th className="px-3 py-3 text-right">Outcomes</th>
                    <th className="px-4 py-3 text-right">Prize</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => (
                    <tr
                      key={r.userId}
                      className={cn(
                        "border-b border-white/5 transition",
                        r.isMe ? "bg-pitch-500/10" : "hover:bg-white/[0.03]",
                      )}
                    >
                      <td className="px-4 py-2.5 font-bold text-navy-300">
                        {tab === "overall" ? (
                          <span className="flex items-center gap-1">
                            {rankBadge(r.rank) ?? r.rank}
                          </span>
                        ) : (
                          i + 1
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-white">
                        {r.name}
                        {r.isMe && <span className="ml-2 text-xs text-pitch-300">(you)</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums text-pitch-300">
                        {r.totalPoints}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-navy-200">{r.groupStagePoints}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-navy-200">{r.knockoutTeamPoints}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-navy-200">{r.knockoutStagePoints}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-navy-200">{r.championPoints}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-navy-300">{r.exactScoreHits}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-navy-300">{r.complicatedExactScoreHits}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-navy-300">{r.correctOutcomes}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gold-400">
                        {r.prizeAmount > 0 ? formatAMD(r.prizeAmount) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {sorted.map((r, i) => (
              <Card key={r.userId} className={cn("p-3", r.isMe && "ring-1 ring-pitch-500/40")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 text-center font-bold text-navy-300">
                      {tab === "overall" ? (rankBadge(r.rank) ?? r.rank) : i + 1}
                    </span>
                    <span className="font-semibold text-white">{r.name}</span>
                    {r.isMe && <span className="text-xs text-pitch-300">(you)</span>}
                  </div>
                  <span className="text-lg font-black tabular-nums text-pitch-300">{r.totalPoints}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-navy-300">
                  <Badge variant="muted">Group {r.groupStagePoints}</Badge>
                  <Badge variant="muted">KO {r.knockoutStagePoints + r.knockoutTeamPoints}</Badge>
                  <Badge variant="muted">Champ {r.championPoints}</Badge>
                  <Badge variant="muted">{r.exactScoreHits} exact</Badge>
                  {r.prizeAmount > 0 && <Badge variant="gold">{formatAMD(r.prizeAmount)}</Badge>}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PrizeTable({ rows, prizePool }: { rows: Row[]; prizePool: number }) {
  const winners = rows.filter((r) => r.prizeAmount > 0);
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-white/10 p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-navy-400">Total prize pool</div>
        <div className="mt-1 text-3xl font-black text-gold-400">{formatAMD(prizePool)}</div>
      </div>
      {winners.length === 0 ? (
        <div className="p-8 text-center text-sm text-navy-300">
          No prizes allocated yet — set paid players and enter results.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-navy-400">
              <th className="px-5 py-3">Rank</th>
              <th className="px-5 py-3">Player</th>
              <th className="px-5 py-3 text-right">Prize</th>
            </tr>
          </thead>
          <tbody>
            {winners.map((r) => (
              <tr key={r.userId} className={cn("border-b border-white/5", r.isMe && "bg-pitch-500/10")}>
                <td className="px-5 py-3 font-bold text-navy-200">{rankBadge(r.rank) ?? r.rank}</td>
                <td className="px-5 py-3 font-semibold text-white">{r.name}</td>
                <td className="px-5 py-3 text-right font-bold tabular-nums text-gold-400">
                  {formatAMD(r.prizeAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
