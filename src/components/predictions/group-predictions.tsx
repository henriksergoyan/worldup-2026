"use client";

import { useMemo, useState, useTransition } from "react";
import { CrowdArenaLink } from "@/components/crowd-arena-link";
import { MatchDTO, GroupStandingRowDTO } from "./types";
import { ScoreInput } from "./score-input";
import { TeamChip } from "@/components/team-chip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { saveGroupPredictions, adminSaveGroupPredictions } from "@/app/actions/predictions";
import { cn, formatDateTime } from "@/lib/utils";
import { flagFor, translateTeam } from "@/lib/flags";
import { SaveBar } from "./save-bar";
import {
  PredictionSaveDialog,
  buildBizaConfirmation,
  type BizaConfirmation,
  type PredictionOutcome,
} from "./prediction-save-dialog";

type Local = Record<string, { home: number | null; away: number | null }>;

export function GroupPredictions({
  matches,
  standingsByGroup = {},
  readOnly = false,
  memberLabel,
  adminEditUserId,
}: {
  matches: MatchDTO[];
  standingsByGroup?: Record<string, GroupStandingRowDTO[]>;
  readOnly?: boolean;
  memberLabel?: string;
  /** When set, admin can edit any match for this player (ignores locks / finalized results). */
  adminEditUserId?: string;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [local, setLocal] = useState<Local>(() => {
    const init: Local = {};
    for (const m of matches) {
      init[m.id] = { home: m.pred?.normalHome ?? null, away: m.pred?.normalAway ?? null };
    }
    return init;
  });
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState<BizaConfirmation | null>(null);
  const [pendingItems, setPendingItems] = useState<
    { matchId: string; home: number | null; away: number | null }[]
  >([]);
  // Groups start collapsed; the header carries a recent-results summary.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const matchById = useMemo(() => {
    const map = new Map<string, MatchDTO>();
    for (const m of matches) map.set(m.id, m);
    return map;
  }, [matches]);

  const groups = useMemo(() => {
    const map = new Map<string, MatchDTO[]>();
    for (const m of matches) {
      const key = m.groupCode ?? "—";
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [matches]);

  function update(id: string, side: "home" | "away", v: number | null) {
    setLocal((prev) => ({ ...prev, [id]: { ...prev[id], [side]: v } }));
    setDirty((prev) => new Set(prev).add(id));
  }

  function save() {
    const items = [...dirty].map((id) => ({
      matchId: id,
      home: local[id].home,
      away: local[id].away,
    }));
    if (items.length === 0) {
      toast("Պահպանելու փոփոխություն չկա:", "info");
      return;
    }

    const outcomes: PredictionOutcome[] = [];
    for (const item of items) {
      if (item.home === null || item.away === null) continue;
      const m = matchById.get(item.matchId);
      if (!m) continue;
      const homeName = m.homeName ?? m.homeSeedLabel;
      const awayName = m.awayName ?? m.awaySeedLabel;
      if (!homeName || !awayName) continue;
      outcomes.push({
        homeName,
        awayName,
        result: item.home > item.away ? "HOME" : item.away > item.home ? "AWAY" : "DRAW",
      });
    }

    const confirm = buildBizaConfirmation(outcomes);
    if (!confirm) {
      runSave(items);
      return;
    }
    setPendingItems(items);
    setConfirmation(confirm);
  }

  function runSave(items: { matchId: string; home: number | null; away: number | null }[]) {
    start(async () => {
      const res = adminEditUserId
        ? await adminSaveGroupPredictions(adminEditUserId, items)
        : await saveGroupPredictions(items);
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) setDirty(new Set());
      setConfirmation(null);
      setPendingItems([]);
    });
  }

  const editable = !readOnly || !!adminEditUserId;

  return (
    <div className="space-y-4 pb-savebar">
      {groups.map(([code, list]) => {
        const isExpanded = expandedGroups[code] ?? false;
        const completedCount = list.filter((m) => m.actual !== null).length;
        const totalPoints = list.reduce((sum, m) => sum + (m.points ?? 0), 0);
        const groupAvgPoints = Number(
          list.reduce((sum, m) => sum + (m.averagePoints ?? 0), 0).toFixed(1),
        );

        const unpredictedCount = list.filter((m) => {
          const isLocked = !adminEditUserId && (m.locked || m.actual !== null);
          if (isLocked) return false;
          const val = local[m.id];
          return !val || val.home === null || val.away === null;
        }).length;

        // Most recent finalized games in this group (up to 4).
        const recent = [...list]
          .filter((m) => m.actual !== null)
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
          .slice(0, 4);

        const standings = standingsByGroup[code] ?? [];

        return (
          <div
            key={code}
            className={cn(
              "rounded-2xl border bg-navy-950/20 overflow-hidden transition-all duration-300",
              unpredictedCount > 0
                ? "border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.03)]"
                : "border-white/5"
            )}
          >
            {/* Clickable Collapsible Header */}
            <div
              onClick={() => setExpandedGroups((prev) => ({ ...prev, [code]: !isExpanded }))}
              className={cn(
                "flex flex-col gap-3 p-4 transition cursor-pointer select-none border-b border-white/5",
                unpredictedCount > 0
                  ? "bg-amber-500/[0.02] hover:bg-amber-500/[0.04]"
                  : "bg-white/[0.02] hover:bg-white/[0.05]"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl transition-transform duration-200">{isExpanded ? "📂" : "📁"}</span>
                  <div>
                    <h3 className="font-display text-base font-bold text-white sm:text-lg">Խումբ {code}</h3>
                    <p className="text-xs text-navy-400">{list.length} խաղ · Ավարտված՝ {completedCount}/{list.length}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {unpredictedCount > 0 && (
                    <Badge variant="warning" className="bg-amber-500/20 border-amber-500/35 text-amber-300 animate-pulse">
                      ✍️ {unpredictedCount} չլրացված
                    </Badge>
                  )}
                  <Badge variant="success" className="bg-pitch-900/40 border-pitch-500/20 text-pitch-300">
                    🏆 +{totalPoints} միավոր
                  </Badge>
                  {completedCount > 0 && (
                    <Badge variant="info" className="bg-sky-900/40 border-sky-500/20 text-sky-300">
                      📊 Միջինը՝ {groupAvgPoints} մվ
                    </Badge>
                  )}
                  <span className="text-xs text-navy-400 font-bold ml-1 hidden sm:inline">
                    {isExpanded ? "Փակել ➔" : "Բացել ➔"}
                  </span>
                </div>
              </div>

              {/* Recent results strip (newest labeled "նոր") */}
              {recent.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {recent.map((m) => (
                    <RecentChip key={m.id} m={m} isNew={m.isNew ?? false} />
                  ))}
                </div>
              )}
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
              <div className="p-4 space-y-3 bg-navy-900/10">
                {standings.length > 0 && <GroupStandingsTable rows={standings} />}
                {list.map((m) => (
                  <MatchRow
                    key={m.id}
                    m={m}
                    value={local[m.id]}
                    onChange={(side, v) => update(m.id, side, v)}
                    readOnly={readOnly}
                    memberLabel={memberLabel}
                    adminEdit={!!adminEditUserId}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {editable && <SaveBar count={dirty.size} pending={pending} onSave={save} />}

      <PredictionSaveDialog
        confirmation={confirmation}
        pending={pending}
        onConfirm={() => runSave(pendingItems)}
        onCancel={() => {
          if (pending) return;
          setConfirmation(null);
          setPendingItems([]);
        }}
      />
    </div>
  );
}

/** Compact recent-result chip shown in the collapsed group header. */
function RecentChip({ m, isNew }: { m: MatchDTO; isNew: boolean }) {
  const won = (m.points ?? 0) > 0;
  const hasPred = m.pred != null && m.pred.normalHome !== null && m.pred.normalAway !== null;
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px]",
        isNew ? "border-gold-500/40 bg-gold-500/10" : "border-white/10 bg-white/[0.02]",
      )}
    >
      {isNew && (
        <span className="rounded bg-gold-500/30 px-1 text-[9px] font-bold uppercase tracking-wide text-gold-200">
          նոր
        </span>
      )}
      <span className="font-semibold text-navy-200">
        {m.homeName ? translateTeam(m.homeName) : m.homeSeedLabel} <span className="font-black tabular-nums text-white">{m.actual?.normalHome}–{m.actual?.normalAway}</span> {m.awayName ? translateTeam(m.awayName) : m.awaySeedLabel}
      </span>
      {hasPred ? (
        <span
          className={cn(
            "rounded px-1 font-bold tabular-nums",
            won ? "bg-pitch-500/20 text-pitch-200" : "bg-red-500/20 text-red-300",
          )}
        >
          {won ? `+${m.points}` : "0"}
        </span>
      ) : (
        <span className="rounded bg-white/5 px-1 font-medium text-navy-500">—</span>
      )}
    </div>
  );
}

/** Live group standings table (FIFA order). */
function GroupStandingsTable({ rows }: { rows: GroupStandingRowDTO[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-navy-950/40">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <span className="text-sm">📊</span>
        <span className="text-xs font-bold uppercase tracking-wide text-navy-300">Ընթացիկ աղյուսակ</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-navy-500">
            <th className="px-3 py-1.5 font-semibold">#</th>
            <th className="px-1 py-1.5 font-semibold">Թիմ</th>
            <th className="px-1.5 py-1.5 text-center font-semibold">Խ</th>
            <th className="px-1.5 py-1.5 text-center font-semibold">+</th>
            <th className="px-1.5 py-1.5 text-center font-semibold">−</th>
            <th className="px-1.5 py-1.5 text-center font-semibold">Տ</th>
            <th className="px-1.5 py-1.5 text-center font-semibold">Մ</th>
            <th className="px-2 py-1.5 text-center font-bold text-navy-300">Մվ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const qualifies = r.rank <= 2;
            return (
              <tr
                key={r.teamId}
                className={cn(
                  "border-t border-white/5",
                  qualifies && "bg-pitch-500/[0.06]",
                )}
              >
                <td className="px-3 py-1.5">
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold",
                      qualifies ? "bg-pitch-500/30 text-pitch-200" : "text-navy-400",
                    )}
                  >
                    {r.rank}
                  </span>
                </td>
                <td className="px-1 py-1.5 font-semibold text-white">
                  <span className="mr-1">{flagFor(r.teamName)}</span>
                  {translateTeam(r.teamName)}
                </td>
                <td className="px-1.5 py-1.5 text-center tabular-nums text-navy-300">{r.played}</td>
                <td className="px-1.5 py-1.5 text-center tabular-nums text-navy-300">{r.gf}</td>
                <td className="px-1.5 py-1.5 text-center tabular-nums text-navy-400">{r.ga}</td>
                <td className="px-1.5 py-1.5 text-center tabular-nums text-navy-300">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                <td className="px-1.5 py-1.5 text-center tabular-nums text-navy-400">{r.won}-{r.drawn}-{r.lost}</td>
                <td className="px-2 py-1.5 text-center font-black tabular-nums text-white">{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-3 py-1.5 text-[10px] text-navy-500">
        Խմբից անցնում է 2 թիմ: +՝ խփած, −՝ բաց թողած, Տ՝ տարբերություն, Մ՝ Հ-Ո-Պ, Մվ՝ միավոր:
      </p>
    </div>
  );
}

function MatchRow({
  m,
  value,
  onChange,
  readOnly = false,
  memberLabel,
  adminEdit = false,
}: {
  m: MatchDTO;
  value: { home: number | null; away: number | null };
  onChange: (side: "home" | "away", v: number | null) => void;
  readOnly?: boolean;
  memberLabel?: string;
  adminEdit?: boolean;
}) {
  const disabled = !adminEdit && (readOnly || m.locked || m.actual !== null);
  const useInputs = adminEdit || (!m.locked && m.actual === null);
  const finalized = m.actual !== null;
  const hasPred = value.home !== null && value.away !== null;
  const won = (m.points ?? 0) > 0;
  const lost = finalized && hasPred && !won;
  const missed = finalized && !hasPred;

  return (
    <div
      className={cn(
        "glass sm:p-4 p-3",
        won && "border-pitch-500/40 bg-pitch-500/[0.05]",
        lost && "border-red-500/30 bg-red-500/[0.04]",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-navy-400">
        <span className="truncate">
          #{m.matchNumber} · {formatDateTime(m.scheduledAt)}
          {m.isNew && (
            <span className="ml-1.5 rounded bg-gold-500/25 px-1 py-0.5 text-[9px] font-bold uppercase text-gold-200">
              նոր
            </span>
          )}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {won && <Badge variant="success">✓ +{m.points} միավոր</Badge>}
          {lost && (
            <Badge variant="muted" className="border-red-500/30 bg-red-500/10 text-red-300">
              ✗ 0 միավոր
            </Badge>
          )}
          {missed && (
            <Badge variant="muted" className="border-white/10 bg-white/5 text-navy-400">
              Բաց թողնված
            </Badge>
          )}
          {m.averagePoints !== null && (
            <Badge variant="info" className="bg-sky-950/80 border-sky-900/50 text-sky-400">
              📊 Միջինը՝ {m.averagePoints} մվ
            </Badge>
          )}
          {m.locked && !m.actual && <Badge variant="muted">🔒 Կողպված է</Badge>}
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <TeamChip name={m.homeName} seedLabel={m.homeSeedLabel} align="right" />
          <div className="flex flex-col items-center gap-2">
            {m.actual && adminEdit && (
              <div className="flex flex-col items-center gap-1">
                <div className="text-[10px] font-bold uppercase tracking-wide text-navy-500">Արդյունք</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-white tabular-nums">{m.actual.normalHome}</span>
                  <span className="text-navy-500 font-bold text-lg">:</span>
                  <span className="text-2xl font-black text-white tabular-nums">{m.actual.normalAway}</span>
                </div>
              </div>
            )}
            {useInputs ? (
              <div className="flex flex-col items-center gap-1">
                {m.actual && adminEdit && (
                  <div className="text-[10px] font-bold uppercase tracking-wide text-amber-300">Կանխատեսում</div>
                )}
                <div className="flex items-center gap-1.5">
                  <ScoreInput
                    value={value.home}
                    onChange={(v) => onChange("home", v)}
                    disabled={disabled}
                    ariaLabel={`${m.homeName} goals`}
                  />
                  <span className="text-navy-500">:</span>
                  <ScoreInput
                    value={value.away}
                    onChange={(v) => onChange("away", v)}
                    disabled={disabled}
                    ariaLabel={`${m.awayName} goals`}
                  />
                </div>
              </div>
            ) : m.actual ? (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-white tabular-nums">{m.actual.normalHome}</span>
                  <span className="text-navy-500 font-bold text-lg">:</span>
                  <span className="text-2xl font-black text-white tabular-nums">{m.actual.normalAway}</span>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                    won ? "bg-pitch-500/15 text-pitch-200" : lost ? "bg-red-500/15 text-red-300" : "bg-white/5 text-navy-300",
                  )}
                >
                  <span className="text-[9px] font-bold uppercase tracking-wide opacity-70">
                    {memberLabel ? `${memberLabel}՝` : "Ձեր կանխատեսումը"}
                  </span>
                  <span className="font-black tabular-nums">{value.home ?? "—"}–{value.away ?? "—"}</span>
                </div>
              </div>
            ) : m.locked ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-white/60 tabular-nums">{value.home ?? "—"}</span>
                  <span className="text-navy-500 font-bold text-lg">:</span>
                  <span className="text-2xl font-black text-white/60 tabular-nums">{value.away ?? "—"}</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-navy-400">
                  🔒 Կանխատեսումը կողպված է
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <ScoreInput
                  value={value.home}
                  onChange={(v) => onChange("home", v)}
                  disabled={disabled}
                  ariaLabel={`${m.homeName} goals`}
                />
                <span className="text-navy-500">:</span>
                <ScoreInput
                  value={value.away}
                  onChange={(v) => onChange("away", v)}
                  disabled={disabled}
                  ariaLabel={`${m.awayName} goals`}
                />
              </div>
            )}
          </div>
          <TeamChip name={m.awayName} seedLabel={m.awaySeedLabel} />
        </div>
        <CrowdArenaLink matchId={m.id} disabled={!m.revealed} unlockAt={m.scheduledAt} />
      </div>
    </div>
  );
}
