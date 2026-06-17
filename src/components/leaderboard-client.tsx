"use client";

import Link from "next/link";
import { useMemo, useState, Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type SortKey =
  | "rank"
  | "name"
  | "totalPoints"
  | "groupStagePoints"
  | "playoff"
  | "championPoints"
  | "exactScoreHits"
  | "complicatedExactScoreHits"
  | "correctOutcomes"
  | "prizeAmount";

type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "name", label: "Խաղացող", align: "left" },
  { key: "totalPoints", label: "Ընդհանուր", align: "right" },
  { key: "groupStagePoints", label: "Խմբային", align: "right" },
  { key: "playoff", label: "Փլեյ-օֆֆ", align: "right" },
  { key: "championPoints", label: "Չեմպ", align: "right" },
  { key: "exactScoreHits", label: "Ճշգրիտ", align: "right" },
  { key: "complicatedExactScoreHits", label: "Բարդ ճիշտ", align: "right" },
  { key: "correctOutcomes", label: "Ելքեր", align: "right" },
  { key: "prizeAmount", label: "Մրցանակ", align: "right" },
];

function getValue(r: Row, key: SortKey): number | string {
  switch (key) {
    case "name":
      return r.name;
    case "rank":
      return r.rank;
    case "playoff":
      return r.knockoutStagePoints + r.knockoutTeamPoints;
    default:
      return r[key];
  }
}

function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

/** Collapsed view: podium (top 3) + window around current user. */
function buildCollapsedView(sorted: Row[]): { row: Row; showGapBefore: boolean }[] {
  if (sorted.length <= 8) return sorted.map((row) => ({ row, showGapBefore: false }));

  const myIdx = sorted.findIndex((r) => r.isMe);
  const indices = new Set<number>();

  for (let i = 0; i < Math.min(3, sorted.length); i++) indices.add(i);

  if (myIdx >= 0) {
    for (let i = Math.max(0, myIdx - 2); i <= Math.min(sorted.length - 1, myIdx + 2); i++) {
      indices.add(i);
    }
  }

  const ordered = [...indices].sort((a, b) => a - b);
  return ordered.map((idx, i) => ({
    row: sorted[idx],
    showGapBefore: i > 0 && idx - ordered[i - 1] > 1,
  }));
}

function RowCells({ r, isAdmin }: { r: Row; isAdmin: boolean }) {
  return (
    <>
      <td className="px-4 py-2.5 font-bold text-navy-300">
        <span className="flex items-center gap-1">{rankBadge(r.rank) ?? r.rank}</span>
      </td>
      <td className="px-4 py-2.5 font-semibold text-white">
        {isAdmin ? (
          <Link
            href={`/admin/members/${r.userId}`}
            className="text-pitch-300 transition hover:text-pitch-200 hover:underline"
          >
            {r.name}
          </Link>
        ) : (
          r.name
        )}
        {r.isMe && <span className="ml-2 text-xs text-pitch-300">(դու)</span>}
      </td>
      <td className="px-3 py-2.5 text-right font-bold tabular-nums text-pitch-300">{r.totalPoints}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-navy-200">{r.groupStagePoints}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-navy-200">
        {r.knockoutStagePoints + r.knockoutTeamPoints}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-navy-200">{r.championPoints}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-navy-300">{r.exactScoreHits}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-navy-300">{r.complicatedExactScoreHits}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-navy-300">{r.correctOutcomes}</td>
      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gold-400">
        {r.prizeAmount > 0 ? formatAMD(r.prizeAmount) : "—"}
      </td>
    </>
  );
}

export function LeaderboardClient({
  rows,
  isAdmin = false,
}: {
  rows: Row[];
  prizePool: number;
  isAdmin?: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expanded, setExpanded] = useState(false);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "rank" ? "asc" : "desc");
    }
  }

  const rankSorted = useMemo(
    () => [...rows].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name)),
    [rows],
  );

  const sorted = useMemo(() => {
    const copy = [...rows];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      const av = getValue(a, sortKey);
      const bv = getValue(b, sortKey);
      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv) * dir;
      }
      return ((av as number) - (bv as number)) * dir;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const displayRows = expanded
    ? sorted.map((row) => ({ row, showGapBefore: false }))
    : buildCollapsedView(rankSorted);
  const canCollapse = sorted.length > 8;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-navy-400">
          {expanded ? `Բոլոր ${sorted.length} մասնակիցները` : "Ցուցադրվում են առաջատարները և ձեր շրջապատը"}
        </p>
        {canCollapse && (
          <Button variant="outline" size="sm" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Ծալել աղյուսակը ↑" : `Տեսնել ամբողջ աղյուսակը (${sorted.length}) →`}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <label className="text-xs font-semibold uppercase tracking-wide text-navy-400">Դասավորել՝</label>
        <select
          value={sortKey}
          onChange={(e) => handleSort(e.target.value as SortKey)}
          className="h-10 flex-1 rounded-xl border border-white/10 bg-navy-900/80 px-3 text-sm font-semibold text-white outline-none focus:border-pitch-400"
        >
          <option value="rank">Տեղ</option>
          {COLUMNS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-navy-200 transition hover:bg-white/5"
          aria-label="Ուղղություն"
        >
          {sortDir === "asc" ? "▲" : "▼"}
        </button>
      </div>

      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="px-4 py-3">#</th>
                {COLUMNS.map((c) => {
                  const active = sortKey === c.key;
                  return (
                    <th
                      key={c.key}
                      className={cn(c.align === "right" ? "px-3 py-3 text-right" : "px-4 py-3")}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(c.key)}
                        className={cn(
                          "inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-white",
                          c.align === "right" && "flex-row-reverse",
                          active && "text-pitch-300",
                        )}
                      >
                        {c.label}
                        <span className="text-[9px] leading-none">
                          {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayRows.map(({ row, showGapBefore }) => (
                <Fragment key={row.userId}>
                  {showGapBefore && (
                    <tr className="border-b border-white/5">
                      <td colSpan={COLUMNS.length + 1} className="px-4 py-1.5 text-center text-xs text-navy-500">
                        ···
                      </td>
                    </tr>
                  )}
                  <tr
                    className={cn(
                      "border-b border-white/5 transition",
                      row.isMe ? "bg-pitch-500/10" : "hover:bg-white/[0.03]",
                    )}
                  >
                    <RowCells r={row} isAdmin={isAdmin} />
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="space-y-2 md:hidden">
        {displayRows.map(({ row, showGapBefore }) => (
          <div key={row.userId}>
            {showGapBefore && (
              <div className="py-1 text-center text-xs text-navy-500">···</div>
            )}
            <Card className={cn("p-3", row.isMe && "ring-1 ring-pitch-500/40")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 text-center font-bold text-navy-300">
                    {rankBadge(row.rank) ?? row.rank}
                  </span>
                  <span className="font-semibold text-white">
                    {isAdmin ? (
                      <Link
                        href={`/admin/members/${row.userId}`}
                        className="text-pitch-300 transition hover:text-pitch-200 hover:underline"
                      >
                        {row.name}
                      </Link>
                    ) : (
                      row.name
                    )}
                  </span>
                  {row.isMe && <span className="text-xs text-pitch-300">(դու)</span>}
                </div>
                <span className="text-lg font-black tabular-nums text-pitch-300">{row.totalPoints} միավոր</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-navy-300">
                <Badge variant="muted">Խումբ՝ {row.groupStagePoints}</Badge>
                <Badge variant="muted">Փլեյ-օֆֆ՝ {row.knockoutStagePoints + row.knockoutTeamPoints}</Badge>
                <Badge variant="muted">Չեմպ՝ {row.championPoints}</Badge>
                <Badge variant="muted">{row.exactScoreHits} ճշգրիտ հաշիվ</Badge>
                {row.prizeAmount > 0 && <Badge variant="gold">{formatAMD(row.prizeAmount)}</Badge>}
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
