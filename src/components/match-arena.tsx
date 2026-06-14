"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";
import { getOutcome } from "@/lib/scoring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamChip } from "@/components/team-chip";
import { ROUND_LABELS, STAGES, type Round } from "@/lib/constants";

export interface ArenaPrediction {
  userId: string;
  name: string;
  home: number;
  away: number;
  points: number | null;
  isMe: boolean;
}

export interface MatchArenaProps {
  matchId: string;
  matchNumber: number;
  stage: string;
  round: string | null;
  groupCode: string | null;
  scheduledAt: string;
  homeName: string | null;
  awayName: string | null;
  homeSeedLabel: string | null;
  awaySeedLabel: string | null;
  actual: { home: number; away: number } | null;
  finalized: boolean;
  canReveal: boolean;
  lockAt: string;
  myUserId: string;
  predictions: ArenaPrediction[];
  totalPlayers: number;
}

type Tab = "crowd" | "heatmap" | "rivals";

export function MatchArena(props: MatchArenaProps) {
  const [tab, setTab] = useState<Tab>("crowd");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(props.canReveal);

  const preds = props.predictions;
  const me = preds.find((p) => p.isMe);
  const selected = preds.find((p) => p.userId === selectedId) ?? null;

  const dist = useMemo(() => {
    const d = { "1": 0, X: 0, "2": 0 };
    for (const p of preds) d[getOutcome(p.home, p.away)]++;
    return d;
  }, [preds]);

  const total = preds.length || 1;

  const scoreCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of preds) {
      const k = `${p.home}-${p.away}`;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [preds]);

  const soulmates = useMemo(() => {
    if (!me) return [];
    return preds.filter(
      (p) => !p.isMe && p.home === me.home && p.away === me.away,
    );
  }, [preds, me]);

  const contrarians = useMemo(() => {
    if (!me) return [];
    const myOutcome = getOutcome(me.home, me.away);
    return preds.filter((p) => !p.isMe && getOutcome(p.home, p.away) !== myOutcome);
  }, [preds, me]);

  const stageLabel =
    props.stage === STAGES.KNOCKOUT
      ? ROUND_LABELS[(props.round as Round) ?? "R32"]
      : `Group ${props.groupCode}`;

  return (
    <div className="space-y-5">
      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-pitch-600 via-pitch-400 to-gold-500" />
        <CardContent className="pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-navy-400">
            <span>
              #{props.matchNumber} · {stageLabel} · {formatDateTime(props.scheduledAt)}
            </span>
            {!props.canReveal && (
              <Badge variant="warning">Predictions lock {relativeTime(props.lockAt)}</Badge>
            )}
            {props.canReveal && !props.finalized && (
              <Badge variant="info">Predictions revealed — match upcoming</Badge>
            )}
            {props.finalized && <Badge variant="success">Final</Badge>}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            <TeamChip name={props.homeName} seedLabel={props.homeSeedLabel} align="right" className="text-lg" />
            <div className="rounded-2xl bg-navy-900 px-5 py-3 text-center shadow-glow">
              {props.actual ? (
                <div className="text-4xl font-black tabular-nums text-white">
                  {props.actual.home}–{props.actual.away}
                </div>
              ) : (
                <div className="text-3xl font-black text-navy-500">vs</div>
              )}
              {me && (
                <div className="mt-1 text-xs text-pitch-300">
                  Your pick: {me.home}–{me.away}
                  {me.points !== null && ` · +${me.points} pts`}
                </div>
              )}
            </div>
            <TeamChip name={props.awayName} seedLabel={props.awaySeedLabel} className="text-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Teaser before reveal */}
      {!revealed && !props.canReveal && (
        <Card className="border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="text-5xl">🎭</div>
            <div>
              <h3 className="font-display text-xl font-bold text-white">Predictions are hidden</h3>
              <p className="mt-1 max-w-md text-sm text-navy-300">
                <span className="font-bold text-white">{preds.length}</span> of{" "}
                <span className="font-bold text-white">{props.totalPlayers}</span> players have submitted
                picks. Everyone&apos;s choices unlock{" "}
                <span className="text-amber-200">{relativeTime(props.lockAt)}</span> (1 hour before kickoff).
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <TeaserStat label="Submitted" value={String(preds.length)} />
              <TeaserStat label="Waiting" value={String(Math.max(0, props.totalPlayers - preds.length))} />
            </div>
            {me && (
              <div className="rounded-xl border border-pitch-500/30 bg-pitch-500/10 px-4 py-2 text-sm text-pitch-100">
                Your prediction is locked in: <strong>{me.home}–{me.away}</strong>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reveal button for admin early access feel - if canReveal show full UI */}
      {(revealed || props.canReveal) && (
        <>
          {/* Quick stats row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Predictions" value={preds.length} icon="📋" />
            <MiniStat
              label="Most picked"
              value={scoreCounts[0] ? scoreCounts[0][0] : "—"}
              sub={scoreCounts[0] ? `${scoreCounts[0][1]} players` : undefined}
              icon="🎯"
            />
            <MiniStat label="Soulmates" value={soulmates.length} sub="same as you" icon="🤝" />
            <MiniStat label="Contrarians" value={contrarians.length} sub="different outcome" icon="⚔️" />
          </div>

          {/* Outcome bars */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Crowd consensus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(
                [
                  ["1", `${props.homeName ?? "Home"} win`, "from-pitch-600 to-pitch-400"],
                  ["X", "Draw", "from-amber-600 to-amber-400"],
                  ["2", `${props.awayName ?? "Away"} win`, "from-sky-600 to-sky-400"],
                ] as const
              ).map(([k, label, grad]) => {
                const count = dist[k];
                const pct = Math.round((count / total) * 100);
                const isMyPick = me && getOutcome(me.home, me.away) === k;
                return (
                  <div key={k}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className={cn("text-navy-200", isMyPick && "font-bold text-pitch-200")}>
                        {label} {isMyPick && "★"}
                      </span>
                      <span className="font-semibold tabular-nums text-white">
                        {count} · {pct}%
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", grad)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] p-1.5">
            {(
              [
                ["crowd", "👥 Everyone"],
                ["heatmap", "🔥 Score heatmap"],
                ["rivals", "⚔️ Rivals"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                  tab === id ? "bg-pitch-500/20 text-pitch-100" : "text-navy-300 hover:bg-white/5",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "crowd" && (
            <Card>
              <CardContent className="divide-y divide-white/5 p-0">
                {preds
                  .slice()
                  .sort((a, b) => (b.points ?? -1) - (a.points ?? -1) || a.name.localeCompare(b.name))
                  .map((p) => (
                    <button
                      key={p.userId}
                      type="button"
                      onClick={() => setSelectedId(p.userId === selectedId ? null : p.userId)}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/[0.04]",
                        p.isMe && "bg-pitch-500/10",
                        selectedId === p.userId && "ring-1 ring-inset ring-pitch-500/40",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} isMe={p.isMe} />
                        <div>
                          <div className="font-semibold text-white">
                            {p.name}
                            {p.isMe && <span className="ml-2 text-xs text-pitch-300">(you)</span>}
                          </div>
                          {me && !p.isMe && (
                            <div className="text-xs text-navy-400">
                              {p.home === me.home && p.away === me.away
                                ? "🤝 Exact same pick!"
                                : getOutcome(p.home, p.away) === getOutcome(me.home, me.away)
                                  ? "Same outcome"
                                  : "Different outcome"}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ScorePill home={p.home} away={p.away} highlight={p.home === me?.home && p.away === me?.away} />
                        {p.points !== null && (
                          <Badge variant={p.points > 0 ? "success" : "muted"}>+{p.points}</Badge>
                        )}
                      </div>
                    </button>
                  ))}
              </CardContent>
            </Card>
          )}

          {tab === "heatmap" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Score heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreHeatmap predictions={preds} me={me} actual={props.actual} />
                <p className="mt-3 text-xs text-navy-400">
                  Brighter cells = more players picked that score. ★ = your pick.
                </p>
              </CardContent>
            </Card>
          )}

          {tab === "rivals" && (
            <div className="grid gap-4 md:grid-cols-2">
              <RivalList title="🤝 Soulmates" subtitle="Picked the exact same score as you" items={soulmates} me={me} />
              <RivalList title="⚔️ Contrarians" subtitle="Predicted a different outcome" items={contrarians.slice(0, 12)} me={me} />
            </div>
          )}

          {selected && me && !selected.isMe && (
            <Card className="border-pitch-500/30 bg-pitch-500/[0.06]">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
                <div>
                  <div className="text-xs uppercase tracking-wide text-pitch-300">Head-to-head</div>
                  <div className="mt-1 font-display text-lg font-bold text-white">
                    You vs {selected.name}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-xs text-navy-400">You</div>
                    <ScorePill home={me.home} away={me.away} highlight />
                  </div>
                  <span className="text-navy-500">vs</span>
                  <div className="text-center">
                    <div className="text-xs text-navy-400">{selected.name}</div>
                    <ScorePill home={selected.home} away={selected.away} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="flex gap-2">
        <Link href="/predictions">
          <Button variant="ghost" size="sm">
            ← My predictions
          </Button>
        </Link>
        <Link href="/leaderboard">
          <Button variant="ghost" size="sm">
            Leaderboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

function TeaserStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs text-navy-400">{label}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
}) {
  return (
    <div className="glass p-3">
      <div className="text-lg">{icon}</div>
      <div className="mt-1 text-xl font-black text-white">{value}</div>
      <div className="text-xs text-navy-400">{label}</div>
      {sub && <div className="text-[10px] text-navy-500">{sub}</div>}
    </div>
  );
}

function Avatar({ name, isMe }: { name: string; isMe: boolean }) {
  const parts = name.split(/\s+/);
  const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
        isMe ? "bg-pitch-500/30 text-pitch-100 ring-2 ring-pitch-500/50" : "bg-white/10 text-navy-200",
      )}
    >
      {initials.toUpperCase()}
    </div>
  );
}

function ScorePill({
  home,
  away,
  highlight,
}: {
  home: number;
  away: number;
  highlight?: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums",
        highlight ? "bg-gold-500/20 text-gold-300 ring-1 ring-gold-500/40" : "bg-navy-900 text-white",
      )}
    >
      {home}–{away}
    </span>
  );
}

function ScoreHeatmap({
  predictions,
  me,
  actual,
}: {
  predictions: ArenaPrediction[];
  me?: ArenaPrediction;
  actual: { home: number; away: number } | null;
}) {
  const maxGoals = 5;
  const grid: number[][] = Array.from({ length: maxGoals + 1 }, () => Array(maxGoals + 1).fill(0));
  let maxCount = 0;
  for (const p of predictions) {
    if (p.home <= maxGoals && p.away <= maxGoals) {
      grid[p.home][p.away]++;
      maxCount = Math.max(maxCount, grid[p.home][p.away]);
    }
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `auto repeat(${maxGoals + 1}, 2rem)` }}>
        <div />
        {Array.from({ length: maxGoals + 1 }, (_, a) => (
          <div key={`a${a}`} className="text-center text-[10px] text-navy-500">
            {a}
          </div>
        ))}
        {grid.map((row, h) => (
          <div key={`row-${h}`} className="contents">
            <div className="flex items-center justify-end pr-1 text-[10px] text-navy-500">{h}</div>
            {row.map((count, a) => {
              const isMe = me && me.home === h && me.away === a;
              const isActual = actual && actual.home === h && actual.away === a;
              const intensity = maxCount > 0 ? count / maxCount : 0;
              return (
                <div
                  key={`${h}-${a}`}
                  title={`${h}-${a}: ${count} picks`}
                  className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-md text-[10px] font-bold transition",
                    count === 0 ? "bg-white/[0.03]" : "",
                    isActual && "ring-2 ring-gold-500",
                    isMe && "ring-2 ring-pitch-400",
                  )}
                  style={
                    count > 0
                      ? { backgroundColor: `rgba(34, 150, 91, ${0.15 + intensity * 0.75})` }
                      : undefined
                  }
                >
                  {count > 0 ? count : ""}
                  {isMe && <span className="absolute -right-0.5 -top-0.5 text-[8px]">★</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function RivalList({
  title,
  subtitle,
  items,
  me,
}: {
  title: string;
  subtitle: string;
  items: ArenaPrediction[];
  me?: ArenaPrediction;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-navy-400">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-navy-500">None yet</p>
        ) : (
          items.map((p) => (
            <div key={p.userId} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
              <span className="font-medium text-white">{p.name}</span>
              <ScorePill home={p.home} away={p.away} highlight={me && p.home === me.home && p.away === me.away} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
