"use client";

import { useMemo, useState, useTransition } from "react";
import { CrowdArenaLink } from "@/components/crowd-arena-link";
import { MatchDTO } from "./types";
import { ScoreInput } from "./score-input";
import { SaveBar } from "./group-predictions";
import { TeamChip } from "@/components/team-chip";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { translateTeam } from "@/lib/flags";
import { saveKnockoutPredictions } from "@/app/actions/predictions";
import { resolveKnockoutWinner, sanitizeKnockoutExtras, canEnterKnockoutPenalties, isKnockoutNormalDraw, patchKnockoutFields } from "@/lib/scoring";
import { ROUND_LABELS, ROUNDS, type Round } from "@/lib/constants";
import {
  PredictionSaveDialog,
  buildBizaConfirmation,
  type BizaConfirmation,
  type PredictionOutcome,
} from "./prediction-save-dialog";

interface KO {
  normalHome: number | null;
  normalAway: number | null;
  extraHome: number | null;
  extraAway: number | null;
  penaltyHome: number | null;
  penaltyAway: number | null;
  winner: "HOME" | "AWAY" | null;
}

type Local = Record<string, KO>;

export function KnockoutPredictions({
  matches,
  readOnly = false,
  memberLabel,
}: {
  matches: MatchDTO[];
  readOnly?: boolean;
  memberLabel?: string;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [local, setLocal] = useState<Local>(() => {
    const init: Local = {};
    for (const m of matches) {
      const normalHome = m.pred?.normalHome ?? null;
      const normalAway = m.pred?.normalAway ?? null;
      const extraHome = m.pred?.extraHome ?? null;
      const extraAway = m.pred?.extraAway ?? null;
      const penaltyHome = m.pred?.penaltyHome ?? null;
      const penaltyAway = m.pred?.penaltyAway ?? null;
      const sanitized =
        normalHome !== null && normalAway !== null
          ? sanitizeKnockoutExtras({
              normal: { home: normalHome, away: normalAway },
              extra: { home: extraHome, away: extraAway },
              penalty: { home: penaltyHome, away: penaltyAway },
            })
          : null;
      init[m.id] = {
        normalHome,
        normalAway,
        extraHome: sanitized?.extra.home ?? extraHome,
        extraAway: sanitized?.extra.away ?? extraAway,
        penaltyHome: sanitized?.penalty.home ?? penaltyHome,
        penaltyAway: sanitized?.penalty.away ?? penaltyAway,
        winner: m.pred?.winner ?? null,
      };
    }
    return init;
  });
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState<BizaConfirmation | null>(null);
  const [pendingItems, setPendingItems] = useState<({ matchId: string } & KO)[]>([]);
  // Rounds start collapsed for a cleaner overview.
  const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({});

  const matchById = useMemo(() => {
    const map = new Map<string, MatchDTO>();
    for (const m of matches) map.set(m.id, m);
    return map;
  }, [matches]);

  const rounds = useMemo(() => {
    const map = new Map<string, MatchDTO[]>();
    for (const m of matches) {
      const key = m.round ?? "R32";
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return ROUNDS.filter((r) => map.has(r)).map((r) => [r, map.get(r)!] as [Round, MatchDTO[]]);
  }, [matches]);

  function patch(id: string, p: Partial<KO>) {
    setLocal((prev) => {
      const current = prev[id];
      const updates = patchKnockoutFields(current, p);
      return { ...prev, [id]: { ...current, ...updates } };
    });
    setDirty((prev) => new Set(prev).add(id));
  }

  function save() {
    const items = [...dirty].map((id) => ({ matchId: id, ...local[id] }));
    if (items.length === 0) {
      toast("Պահպանելու փոփոխություն չկա:", "info");
      return;
    }

    const outcomes: PredictionOutcome[] = [];
    for (const item of items) {
      const m = matchById.get(item.matchId);
      if (!m) continue;
      const homeName = m.homeName ?? m.homeSeedLabel;
      const awayName = m.awayName ?? m.awaySeedLabel;
      if (!homeName || !awayName) continue;
      const winnerSide = resolveKnockoutWinner({
        normal: { home: item.normalHome, away: item.normalAway },
        extra: { home: item.extraHome, away: item.extraAway },
        penalty: { home: item.penaltyHome, away: item.penaltyAway },
        winner: item.winner,
      });
      if (winnerSide === null) continue;
      outcomes.push({ homeName, awayName, result: winnerSide });
    }

    const confirm = buildBizaConfirmation(outcomes);
    if (!confirm) {
      runSave(items);
      return;
    }
    setPendingItems(items);
    setConfirmation(confirm);
  }

  function runSave(items: ({ matchId: string } & KO)[]) {
    start(async () => {
      const res = await saveKnockoutPredictions(items);
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) setDirty(new Set());
      setConfirmation(null);
      setPendingItems([]);
    });
  }

  if (matches.length === 0) {
    return (
      <div className="glass flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl">🥅</div>
        <p className="mt-3 font-semibold text-white">Փլեյ-օֆֆի խաղերը դեռ հասանելի չեն</p>
        <p className="mt-1 max-w-sm text-sm text-navy-300">
          Ադմինիստրատորը կավելացնի փլեյ-օֆֆի խաղերը, հենց խմբերի արդյունքները պարզ դառնան:
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-savebar">
      {rounds.map(([round, list]) => {
        const isExpanded = expandedRounds[round] ?? false;
        const completedCount = list.filter((m) => m.actual !== null).length;
        const totalPoints = list.reduce((sum, m) => sum + (m.points ?? 0), 0);

        const unpredictedCount = list.filter((m) => {
          const isLocked = m.locked || m.actual !== null;
          if (isLocked) return false;
          const val = local[m.id];
          return !val || val.normalHome === null || val.normalAway === null;
        }).length;

        return (
          <div
            key={round}
            className={cn(
              "rounded-2xl border bg-navy-950/20 overflow-hidden transition-all duration-300",
              unpredictedCount > 0
                ? "border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.03)]"
                : "border-white/5"
            )}
          >
            {/* Clickable Collapsible Header */}
            <div
              onClick={() => setExpandedRounds((prev) => ({ ...prev, [round]: !isExpanded }))}
              className={cn(
                "flex flex-wrap items-center justify-between gap-4 p-4 transition cursor-pointer select-none border-b border-white/5",
                unpredictedCount > 0
                  ? "bg-amber-500/[0.02] hover:bg-amber-500/[0.04]"
                  : "bg-white/[0.02] hover:bg-white/[0.05]"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{isExpanded ? "📂" : "📁"}</span>
                <div>
                  <h3 className="font-display text-base font-bold text-white sm:text-lg">{ROUND_LABELS[round]}</h3>
                  <p className="text-xs text-navy-400">{list.length} խաղ · Ավարտված՝ {completedCount}/{list.length}</p>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {unpredictedCount > 0 && (
                  <Badge variant="warning" className="bg-amber-500/20 border-amber-500/35 text-amber-300 animate-pulse">
                    ✍️ {unpredictedCount} չլրացված
                  </Badge>
                )}
                <Badge variant="success" className="bg-pitch-900/40 border-pitch-500/20 text-pitch-300">
                  🏆 +{totalPoints} միավոր
                </Badge>
                <span className="text-xs text-navy-400 font-bold ml-1 hidden sm:inline">
                  {isExpanded ? "Փակել ➔" : "Բացել ➔"}
                </span>
              </div>
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
              <div className="p-4 space-y-3 bg-navy-900/10">
                {list.map((m) => (
                  <KnockoutRow
                    key={m.id}
                    m={m}
                    value={local[m.id]}
                    onChange={(p) => patch(m.id, p)}
                    readOnly={readOnly}
                    memberLabel={memberLabel}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
      {!readOnly && <SaveBar count={dirty.size} pending={pending} onSave={save} />}

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

function KnockoutRow({
  m,
  value,
  onChange,
  readOnly = false,
  memberLabel,
}: {
  m: MatchDTO;
  value: KO;
  onChange: (p: Partial<KO>) => void;
  readOnly?: boolean;
  memberLabel?: string;
}) {
  const disabled = readOnly || m.locked || m.actual !== null;
  const derivedWinner = resolveKnockoutWinner({
    normal: { home: value.normalHome, away: value.normalAway },
    extra: { home: value.extraHome, away: value.extraAway },
    penalty: { home: value.penaltyHome, away: value.penaltyAway },
    winner: value.winner,
  });
  const hasScores = value.normalHome !== null && value.normalAway !== null;
  const normalIsDraw = hasScores && isKnockoutNormalDraw({ home: value.normalHome, away: value.normalAway });
  const pensEnabled =
    hasScores &&
    canEnterKnockoutPenalties({
      normal: { home: value.normalHome, away: value.normalAway },
      extra: { home: value.extraHome, away: value.extraAway },
    });
  const ambiguous = hasScores && derivedWinner === null;
  const finalized = m.actual !== null;
  const won = (m.points ?? 0) > 0;
  const lost = finalized && hasScores && !won;
  const missed = finalized && !hasScores;

  return (
    <div
      className={cn(
        "glass p-3 sm:p-4",
        won && "border-pitch-500/40 bg-pitch-500/[0.05]",
        lost && "border-red-500/30 bg-red-500/[0.04]",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-navy-400">
        <span className="truncate">
          #{m.matchNumber} · {formatDateTime(m.scheduledAt)}
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
          {m.locked && !finalized && <Badge variant="muted">🔒 Կողպված</Badge>}
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
            <TeamChip name={m.homeName} seedLabel={m.homeSeedLabel} align="right" />
            {m.actual ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-white tabular-nums">{m.actual.normalHome}</span>
                  <span className="text-navy-500 font-bold text-lg">:</span>
                  <span className="text-2xl font-black text-white tabular-nums">{m.actual.normalAway}</span>
                </div>
                <div className="text-[11px] font-semibold text-pitch-300">
                  {memberLabel ? `${memberLabel}՝` : "Ձեր կանխատեսումը՝"}{" "}
                  <span className="font-bold">
                    {value.normalHome ?? "—"} – {value.normalAway ?? "—"}
                  </span>
                </div>
              </div>
            ) : m.locked ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-white/60 tabular-nums">{value.normalHome ?? "—"}</span>
                  <span className="text-navy-500 font-bold text-lg">:</span>
                  <span className="text-2xl font-black text-white/60 tabular-nums">{value.normalAway ?? "—"}</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-navy-400">
                  🔒 Կանխատեսումը կողպված է
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <ScoreInput value={value.normalHome} onChange={(v) => onChange({ normalHome: v })} disabled={disabled} />
                <span className="text-navy-500">:</span>
                <ScoreInput value={value.normalAway} onChange={(v) => onChange({ normalAway: v })} disabled={disabled} />
              </div>
            )}
            <TeamChip name={m.awayName} seedLabel={m.awaySeedLabel} />
          </div>
        </div>
        <CrowdArenaLink matchId={m.id} disabled={!m.revealed} />
      </div>

      {normalIsDraw && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SmallScorePair
            label="Լրացուցիչ ժամանակ"
            home={value.extraHome}
            away={value.extraAway}
            onHome={(v) => onChange({ extraHome: v })}
            onAway={(v) => onChange({ extraAway: v })}
            disabled={disabled}
          />
          {pensEnabled && (
            <SmallScorePair
              label="11 մետրանոցներ"
              home={value.penaltyHome}
              away={value.penaltyAway}
              onHome={(v) => onChange({ penaltyHome: v })}
              onAway={(v) => onChange({ penaltyAway: v })}
              disabled={disabled}
            />
          )}
        </div>
      )}

      {!disabled && hasScores && !normalIsDraw && (
        <p className="mt-3 text-xs text-navy-400">
          Լրացուցիչ ժամանակ և 11 մետրանոցները հասանելի են միայն ոչ-ոքու հաշվի դեպքում։
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-navy-400">Անցնում է հաջորդ փուլ՝</span>
        <WinnerPill
          label={m.homeName ? translateTeam(m.homeName) : (m.homeSeedLabel ?? "Տանտեր")}
          active={derivedWinner === "HOME"}
          onClick={() => !disabled && onChange({ winner: "HOME" })}
          disabled={disabled}
        />
        <WinnerPill
          label={m.awayName ? translateTeam(m.awayName) : (m.awaySeedLabel ?? "Հյուր")}
          active={derivedWinner === "AWAY"}
          onClick={() => !disabled && onChange({ winner: "AWAY" })}
          disabled={disabled}
        />
        {ambiguous && (
          <span className="text-xs font-medium text-amber-300">
            Ոչ-ոքի է: Ընտրի՛ր անցնող թիմին կամ նշանակի՛ր 11 մետրանոցներ:
          </span>
        )}
      </div>
    </div>
  );
}

function SmallScorePair({
  label,
  home,
  away,
  onHome,
  onAway,
  disabled,
}: {
  label: string;
  home: number | null;
  away: number | null;
  onHome: (v: number | null) => void;
  onAway: (v: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
      <span className="text-xs font-medium text-navy-300">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          value={home ?? ""}
          disabled={disabled}
          onChange={(e) => {
            if (disabled) return;
            onHome(e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))));
          }}
          className="h-11 w-11 rounded-lg border border-white/10 bg-navy-900/80 text-center text-base font-bold text-white outline-none focus:border-pitch-400 disabled:opacity-40"
        />
        <span className="text-navy-500">:</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          value={away ?? ""}
          disabled={disabled}
          onChange={(e) => {
            if (disabled) return;
            onAway(e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))));
          }}
          className="h-11 w-11 rounded-lg border border-white/10 bg-navy-900/80 text-center text-base font-bold text-white outline-none focus:border-pitch-400 disabled:opacity-40"
        />
      </div>
    </div>
  );
}

function WinnerPill({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full border px-3.5 py-2 text-xs font-semibold transition",
        active
          ? "border-pitch-500/50 bg-pitch-500/20 text-pitch-100"
          : "border-white/10 bg-white/[0.02] text-navy-300 hover:bg-white/5",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {label}
    </button>
  );
}
