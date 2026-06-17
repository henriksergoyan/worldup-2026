"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { RankTimelinePoint } from "@/lib/rank-timeline";

const MAX_SELECT = 5;

const COLORS = ["#4ade80", "#60a5fa", "#fbbf24", "#f472b6", "#a78bfa"];

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
  const [selected, setSelected] = useState<string[]>(() => defaultSelected.slice(0, MAX_SELECT));
  const [hovered, setHovered] = useState<{ matchId: string; userId: string } | null>(null);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.userId, p.name])), [players]);

  function toggle(userId: string) {
    setSelected((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, userId];
    });
  }

  if (timeline.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-navy-300">
        Դիրքի պատմությունը կհայտնվի առաջին ավարտված խաղից հետո։
      </div>
    );
  }

  const visibleRanks = timeline.flatMap((pt) =>
    selected.map((uid) => pt.ranksByUser[uid]).filter((r): r is number => r != null),
  );
  const minRank = Math.max(1, Math.min(...visibleRanks) - 1);
  const maxRank = Math.min(players.length, Math.max(...visibleRanks) + 1);

  const padding = { top: 28, right: 20, bottom: 56, left: 44 };
  const pointWidth = 44;
  const width = Math.max(480, padding.left + padding.right + (timeline.length - 1) * pointWidth);
  const height = 300;
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

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const span = maxRank - minRank;
    const step = span <= 6 ? 1 : span <= 12 ? 2 : Math.ceil(span / 6);
    for (let r = minRank; r <= maxRank; r += step) ticks.push(r);
    if (ticks[ticks.length - 1] !== maxRank) ticks.push(maxRank);
    return ticks;
  }, [minRank, maxRank]);

  const labelEvery = timeline.length <= 12 ? 1 : timeline.length <= 24 ? 2 : Math.ceil(timeline.length / 12);

  const lines = selected.map((userId, lineIdx) => ({
    userId,
    color: COLORS[lineIdx % COLORS.length],
    points: timeline.map((pt, i) => {
      const rank = pt.ranksByUser[userId];
      if (rank == null) return null;
      return { x: xForIndex(i), y: yForRank(rank), pt, rank, gameIndex: i + 1 };
    }),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {players.map((p) => {
          const active = selected.includes(p.userId);
          const disabled = !active && selected.length >= MAX_SELECT;
          const colorIdx = selected.indexOf(p.userId);
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
                  style={{ background: COLORS[colorIdx % COLORS.length] }}
                />
              )}
              {p.name}
            </button>
          );
        })}
        <span className="self-center text-[11px] text-navy-500">Մինչև {MAX_SELECT} խաղացող</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-gradient-to-b from-navy-950/60 to-navy-950/30 p-2 sm:p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ minWidth: width }}
          role="img"
          aria-label="Դիրքի պատմության գծապատկեր"
        >
          <text
            x={12}
            y={padding.top + innerH / 2}
            transform={`rotate(-90, 12, ${padding.top + innerH / 2})`}
            textAnchor="middle"
            className="fill-navy-400 text-[11px] font-semibold"
          >
            Դիրք
          </text>

          {yTicks.map((rank) => (
            <g key={rank}>
              <line
                x1={padding.left}
                y1={yForRank(rank)}
                x2={width - padding.right}
                y2={yForRank(rank)}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray={rank === 1 ? "0" : "4 4"}
              />
              <text
                x={padding.left - 10}
                y={yForRank(rank) + 4}
                textAnchor="end"
                className="fill-navy-300 text-[11px] font-bold tabular-nums"
              >
                {rank}
              </text>
            </g>
          ))}

          {lines.map((line) => {
            const poly = line.points
              .filter((p): p is NonNullable<typeof p> => p != null)
              .map((p) => `${p.x},${p.y}`)
              .join(" ");
            return (
              <g key={line.userId}>
                <polyline
                  points={poly}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={0.9}
                />
                {line.points.map((p) => {
                  if (!p) return null;
                  const isHovered =
                    hovered?.matchId === p.pt.matchId && hovered?.userId === line.userId;
                  return (
                    <g
                      key={`${line.userId}-${p.pt.matchId}`}
                      onMouseEnter={() => setHovered({ matchId: p.pt.matchId, userId: line.userId })}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <circle cx={p.x} cy={p.y} r={isHovered ? 7 : 5} fill={line.color} opacity={0.95} />
                      <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
                      {isHovered && (
                        <g>
                          <rect
                            x={p.x - 72}
                            y={p.y - 38}
                            width={144}
                            height={30}
                            rx={6}
                            fill="rgba(15,23,42,0.95)"
                            stroke="rgba(255,255,255,0.15)"
                          />
                          <text
                            x={p.x}
                            y={p.y - 24}
                            textAnchor="middle"
                            className="fill-white text-[10px] font-semibold"
                          >
                            {playerMap.get(line.userId)} · #{p.rank}
                          </text>
                          <text
                            x={p.x}
                            y={p.y - 12}
                            textAnchor="middle"
                            className="fill-navy-400 text-[9px]"
                          >
                            Խաղ {p.gameIndex} · {p.pt.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {timeline.map((pt, i) => {
            if (i % labelEvery !== 0 && i !== timeline.length - 1) return null;
            const x = xForIndex(i);
            return (
              <g key={pt.matchId}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="rgba(255,255,255,0.04)"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  className="fill-navy-400 text-[10px] font-semibold tabular-nums"
                >
                  {pt.gameIndex}
                </text>
              </g>
            );
          })}

          <text
            x={padding.left + innerW / 2}
            y={height - 6}
            textAnchor="middle"
            className="fill-navy-400 text-[11px] font-semibold"
          >
            Ավարտված խաղերի հերթականությունը (1–{timeline.length})
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {selected.map((uid, i) => {
          const lastRank = timeline[timeline.length - 1]?.ranksByUser[uid];
          return (
            <span key={uid} className="flex items-center gap-1.5 text-navy-300">
              <span className="h-2.5 w-5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="font-medium text-white">{playerMap.get(uid) ?? uid}</span>
              {lastRank != null && (
                <span className="font-bold tabular-nums text-pitch-300">#{lastRank}</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
