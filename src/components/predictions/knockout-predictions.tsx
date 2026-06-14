"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { MatchDTO } from "./types";
import { ScoreInput } from "./score-input";
import { SaveBar } from "./group-predictions";
import { TeamChip } from "@/components/team-chip";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { saveKnockoutPredictions } from "@/app/actions/predictions";
import { resolveKnockoutWinner } from "@/lib/scoring";
import { ROUND_LABELS, ROUNDS, type Round } from "@/lib/constants";

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

export function KnockoutPredictions({ matches }: { matches: MatchDTO[] }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [local, setLocal] = useState<Local>(() => {
    const init: Local = {};
    for (const m of matches) {
      init[m.id] = {
        normalHome: m.pred?.normalHome ?? null,
        normalAway: m.pred?.normalAway ?? null,
        extraHome: m.pred?.extraHome ?? null,
        extraAway: m.pred?.extraAway ?? null,
        penaltyHome: m.pred?.penaltyHome ?? null,
        penaltyAway: m.pred?.penaltyAway ?? null,
        winner: m.pred?.winner ?? null,
      };
    }
    return init;
  });
  const [dirty, setDirty] = useState<Set<string>>(new Set());

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
    setLocal((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));
    setDirty((prev) => new Set(prev).add(id));
  }

  function save() {
    const items = [...dirty].map((id) => ({ matchId: id, ...local[id] }));
    if (items.length === 0) {
      toast("No changes to save.", "info");
      return;
    }
    start(async () => {
      const res = await saveKnockoutPredictions(items);
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) setDirty(new Set());
    });
  }

  if (matches.length === 0) {
    return (
      <div className="glass flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl">🥅</div>
        <p className="mt-3 font-semibold text-white">Knockout matches not available yet</p>
        <p className="mt-1 max-w-sm text-sm text-navy-300">
          The admin will add knockout fixtures once group standings are known. Check back after the
          group stage.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {rounds.map(([round, list]) => (
        <div key={round}>
          <h3 className="mb-2 font-display text-lg font-bold text-white">{ROUND_LABELS[round]}</h3>
          <div className="space-y-2">
            {list.map((m) => (
              <KnockoutRow key={m.id} m={m} value={local[m.id]} onChange={(p) => patch(m.id, p)} />
            ))}
          </div>
        </div>
      ))}
      <SaveBar count={dirty.size} pending={pending} onSave={save} />
    </div>
  );
}

function KnockoutRow({
  m,
  value,
  onChange,
}: {
  m: MatchDTO;
  value: KO;
  onChange: (p: Partial<KO>) => void;
}) {
  const disabled = m.locked || m.actual !== null;
  const derivedWinner = resolveKnockoutWinner({
    normal: { home: value.normalHome, away: value.normalAway },
    extra: { home: value.extraHome, away: value.extraAway },
    penalty: { home: value.penaltyHome, away: value.penaltyAway },
    winner: value.winner,
  });
  const hasScores = value.normalHome !== null && value.normalAway !== null;
  const ambiguous = hasScores && derivedWinner === null;

  return (
    <div className="glass p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-navy-400">
        <span>
          #{m.matchNumber} · {formatDateTime(m.scheduledAt)}
        </span>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/matches/${m.id}`}
            className="rounded-lg border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-pitch-300 transition hover:border-pitch-500/40 hover:bg-pitch-500/10"
          >
            👥 Crowd
          </Link>
          {m.points !== null && <Badge variant="success">+{m.points} pts</Badge>}
          {m.locked && <Badge variant="muted">🔒 Locked</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <TeamChip name={m.homeName} seedLabel={m.homeSeedLabel} align="right" />
        <div className="flex items-center gap-1.5">
          <ScoreInput value={value.normalHome} onChange={(v) => onChange({ normalHome: v })} disabled={disabled} />
          <span className="text-navy-500">:</span>
          <ScoreInput value={value.normalAway} onChange={(v) => onChange({ normalAway: v })} disabled={disabled} />
        </div>
        <TeamChip name={m.awayName} seedLabel={m.awaySeedLabel} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <SmallScorePair
          label="Extra time"
          home={value.extraHome}
          away={value.extraAway}
          onHome={(v) => onChange({ extraHome: v })}
          onAway={(v) => onChange({ extraAway: v })}
          disabled={disabled}
        />
        <SmallScorePair
          label="Penalties"
          home={value.penaltyHome}
          away={value.penaltyAway}
          onHome={(v) => onChange({ penaltyHome: v })}
          onAway={(v) => onChange({ penaltyAway: v })}
          disabled={disabled}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-navy-400">Advances:</span>
        <WinnerPill
          label={m.homeName ?? m.homeSeedLabel ?? "Home"}
          active={derivedWinner === "HOME"}
          onClick={() => !disabled && onChange({ winner: "HOME" })}
          disabled={disabled}
        />
        <WinnerPill
          label={m.awayName ?? m.awaySeedLabel ?? "Away"}
          active={derivedWinner === "AWAY"}
          onClick={() => !disabled && onChange({ winner: "AWAY" })}
          disabled={disabled}
        />
        {ambiguous && (
          <span className="text-xs font-medium text-amber-300">
            Tie unresolved — choose the advancing team or add penalties.
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
          min={0}
          max={99}
          value={home ?? ""}
          disabled={disabled}
          onChange={(e) => onHome(e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))))}
          className="h-9 w-9 rounded-lg border border-white/10 bg-navy-900/80 text-center text-sm font-bold text-white outline-none focus:border-pitch-400 disabled:opacity-40"
        />
        <span className="text-navy-500">:</span>
        <input
          type="number"
          min={0}
          max={99}
          value={away ?? ""}
          disabled={disabled}
          onChange={(e) => onAway(e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))))}
          className="h-9 w-9 rounded-lg border border-white/10 bg-navy-900/80 text-center text-sm font-bold text-white outline-none focus:border-pitch-400 disabled:opacity-40"
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
        "rounded-full border px-3 py-1 text-xs font-semibold transition",
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
