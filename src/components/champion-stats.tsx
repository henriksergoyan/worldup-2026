"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { flagFor } from "@/lib/flags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ChampionPickRow {
  userId: string;
  name: string;
  teamId: string;
  teamName: string;
  isMe: boolean;
}

export function ChampionStats({
  picks,
  myPickId,
  actualChampionId,
}: {
  picks: ChampionPickRow[];
  myPickId: string | null;
  actualChampionId: string | null;
}) {
  const byTeam = useMemo(() => {
    const map = new Map<string, { teamName: string; count: number; players: string[] }>();
    for (const p of picks) {
      const row = map.get(p.teamId) ?? { teamName: p.teamName, count: 0, players: [] };
      row.count++;
      row.players.push(p.name);
      map.set(p.teamId, row);
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [picks]);

  const myPick = picks.find((p) => p.isMe);
  const max = byTeam[0]?.[1].count ?? 1;

  return (
    <div className="space-y-6">
      <Card className="border-gold-500/25 bg-gradient-to-br from-gold-500/10 to-transparent">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gold-400/90">Քո չեմպիոնը</div>
              {myPick ? (
                <div className="mt-1 flex items-center gap-2 font-display text-2xl font-bold text-white">
                  <span>{flagFor(myPick.teamName)}</span>
                  {myPick.teamName}
                  {actualChampionId === myPick.teamId && <Badge variant="success">Իրական չեմպիոն ★</Badge>}
                </div>
              ) : (
                <p className="mt-1 text-navy-300">Դու դեռ չեմպիոն չես ընտրել:</p>
              )}
            </div>
            {myPick && <Badge variant="muted">🔒 Կողպված ա</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">🏆 Չեմպիոնների ընտրությունը</CardTitle>
          <p className="text-xs text-navy-400">{picks.length} մասնակից կատարել է ընտրություն</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {byTeam.map(([teamId, row]) => {
            const pct = Math.round((row.count / Math.max(picks.length, 1)) * 100);
            const isMine = myPickId === teamId;
            const isActual = actualChampionId === teamId;
            return (
              <div
                key={teamId}
                className={cn(
                  "rounded-xl border p-3",
                  isActual
                    ? "border-gold-500/50 bg-gold-500/10"
                    : isMine
                      ? "border-pitch-500/40 bg-pitch-500/10"
                      : "border-white/10 bg-white/[0.02]",
                )}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2 font-semibold text-white">
                    <span>{flagFor(row.teamName)}</span>
                    {row.teamName}
                    {isMine && <Badge variant="info">Դուք</Badge>}
                    {isActual && <Badge variant="gold">Չեմպիոն 🏆</Badge>}
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-pitch-300">
                    {row.count} մասնակից · {pct}%
                  </span>
                </div>
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400"
                    style={{ width: `${(row.count / max) * 100}%` }}
                  />
                </div>
                <p className="break-words text-xs text-navy-400">{row.players.join(" · ")}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">📋 Բոլորի ընտրությունները</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase text-navy-400">
                <th className="px-4 py-2.5">Խաղացող</th>
                <th className="px-4 py-2.5">Չեմպիոն</th>
              </tr>
            </thead>
            <tbody>
              {picks
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((p) => (
                  <tr
                    key={p.userId}
                    className={cn(
                      "border-b border-white/5",
                      p.isMe && "bg-pitch-500/10",
                      actualChampionId === p.teamId && "bg-gold-500/5",
                    )}
                  >
                    <td className="px-4 py-2.5 font-medium text-white">
                      {p.name}
                      {p.isMe && <span className="ml-1 text-xs text-pitch-300">(դուք)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-navy-200">
                      {flagFor(p.teamName)} {p.teamName}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
