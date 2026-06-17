"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { RankTimelinePoint } from "@/lib/rank-timeline";

const COLORS = ["#4ade80", "#60a5fa", "#fbbf24"];

export interface TimelinePlayerOption {
  userId: string;
  name: string;
}

export function RankTimelineChart({
  timeline,
  players,
  defaultSelected,
}: {
  timeline: RankTimelinePoint[];
  players: TimelinePlayerOption[];
  defaultSelected: string[];
}) {
  const [selected, setSelected] = useState<string[]>(() => defaultSelected.slice(0, 3));

  const playerMap = useMemo(() => new Map(players.map((p) => [p.userId, p.name])), [players]);

  function toggle(userId: string) {
    setSelected((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      if (prev.length >= 3) return prev;
      return [...prev, userId];
    });
  }

  if (timeline.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-navy-300">
        Դիրքի պատմությունը կհայտնվի առաջին խաղի արդյունքից հետո։
      </div>
    );
  }

  const ranks = timeline.flatMap((p) =>
    selected.map((uid) => p.ranksByUser[uid]).filter((r): r is number => r != null),
  );
  const minRank = 1;
  const maxRank = Math.max(...ranks, players.length);
  const padding = { top: 16, right: 16, bottom: 48, left: 36 };
  const width = 720;
  const height = 280;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xStep = timeline.length > 1 ? innerW / (timeline.length - 1) : 0;

  function yForRank(rank: number) {
    if (maxRank === minRank) return padding.top + innerH / 2;
    return padding.top + ((rank - minRank) / (maxRank - minRank)) * innerH;
  }

  function xForIndex(i: number) {
    return padding.left + i * xStep;
  }

  const lines = selected.map((userId, lineIdx) => {
    const points = timeline
      .map((pt, i) => {
        const rank = pt.ranksByUser[userId];
        if (rank == null) return null;
        return `${xForIndex(i)},${yForRank(rank)}`;
      })
      .filter(Boolean)
      .join(" ");
    return { userId, points, color: COLORS[lineIdx % COLORS.length] };
  });

  const tickRanks = useMemo(() => {
    const set = new Set<number>();
    for (let r = 1; r <= maxRank; r++) set.add(r);
    return [...set].sort((a, b) => a - b);
  }, [maxRank]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {players.map((p) => {
          const active = selected.includes(p.userId);
          const disabled = !active && selected.length >= 3;
          return (
            <button
              key={p.userId}
              type="button"
              onClick={() => toggle(p.userId)}
              disabled={disabled}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? "border-pitch-500/50 bg-pitch-500/15 text-pitch-100"
                  : disabled
                    ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-navy-600"
                    : "border-white/10 bg-white/[0.02] text-navy-300 hover:bg-white/5",
              )}
            >
              {active && (
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full"
                  style={{ background: COLORS[selected.indexOf(p.userId) % COLORS.length] }}
                />
              )}
              {p.name}
            </button>
          );
        })}
        <span className="self-center text-[11px] text-navy-500">Մինչև 3 խաղացող</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-navy-950/40 p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[320px] w-full" role="img">
          {tickRanks.map((rank) => (
            <g key={rank}>
              <line
                x1={padding.left}
                y1={yForRank(rank)}
                x2={width - padding.right}
                y2={yForRank(rank)}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={yForRank(rank) + 4}
                textAnchor="end"
                className="fill-navy-400 text-[10px]"
              >
                #{rank}
              </text>
            </g>
          ))}

          {lines.map((line) => (
            <polyline
              key={line.userId}
              points={line.points}
              fill="none"
              stroke={line.color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {lines.map((line) =>
            timeline.map((pt, i) => {
              const rank = pt.ranksByUser[line.userId];
              if (rank == null) return null;
              return (
                <circle
                  key={`${line.userId}-${pt.matchId}`}
                  cx={xForIndex(i)}
                  cy={yForRank(rank)}
                  r={4}
                  fill={line.color}
                />
              );
            }),
          )}

          {timeline.map((pt, i) => (
            <text
              key={pt.matchId}
              x={xForIndex(i)}
              y={height - 8}
              textAnchor="middle"
              className="fill-navy-500 text-[9px]"
            >
              {pt.matchNumber}
            </text>
          ))}
        </svg>
        <p className="mt-2 text-center text-[11px] text-navy-500">
          X՝ խաղի համարը · Y՝ ընդհանուր դիրքը (1 = լավագույն)
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {selected.map((uid, i) => (
          <span key={uid} className="flex items-center gap-1.5 text-navy-300">
            <span className="h-2 w-4 rounded" style={{ background: COLORS[i % COLORS.length] }} />
            {playerMap.get(uid) ?? uid}
            {timeline.length > 0 && (
              <span className="font-bold text-white">
                #{timeline[timeline.length - 1].ranksByUser[uid]}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
