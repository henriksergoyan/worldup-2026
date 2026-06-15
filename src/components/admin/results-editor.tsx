"use client";

import { useMemo, useState, useTransition } from "react";
import { TeamChip } from "@/components/team-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { bulkSaveResults } from "@/app/actions/admin";
import { resolveKnockoutWinner } from "@/lib/scoring";
import { cn, formatDateTime } from "@/lib/utils";
import { ROUND_LABELS, STAGES, type Round } from "@/lib/constants";

export interface ResultDTO {
  id: string;
  matchNumber: number;
  stage: string;
  round: string | null;
  groupCode: string | null;
  scheduledAt: string;
  homeName: string | null;
  awayName: string | null;
  homeSeedLabel: string | null;
  awaySeedLabel: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  result: {
    normalHome: number | null;
    normalAway: number | null;
    extraHome: number | null;
    extraAway: number | null;
    penaltyHome: number | null;
    penaltyAway: number | null;
    winner: "HOME" | "AWAY" | null;
    finalized: boolean;
  } | null;
}

interface State {
  normalHome: number | null;
  normalAway: number | null;
  extraHome: number | null;
  extraAway: number | null;
  penaltyHome: number | null;
  penaltyAway: number | null;
  winner: "HOME" | "AWAY" | null;
  finalized: boolean;
}

function initState(m: ResultDTO): State {
  return {
    normalHome: m.result?.normalHome ?? null,
    normalAway: m.result?.normalAway ?? null,
    extraHome: m.result?.extraHome ?? null,
    extraAway: m.result?.extraAway ?? null,
    penaltyHome: m.result?.penaltyHome ?? null,
    penaltyAway: m.result?.penaltyAway ?? null,
    winner: m.result?.winner ?? null,
    finalized: m.result?.finalized ?? false,
  };
}

export function ResultsEditor({ matches }: { matches: ResultDTO[] }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<"all" | "group" | "knockout" | "pending">("all");
  const [state, setState] = useState<Record<string, State>>(() => {
    const s: Record<string, State> = {};
    for (const m of matches) s[m.id] = initState(m);
    return s;
  });
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  function patch(id: string, p: Partial<State>) {
    setState((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));
    setDirty((prev) => new Set(prev).add(id));
  }

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (filter === "group") return m.stage === STAGES.GROUP;
      if (filter === "knockout") return m.stage === STAGES.KNOCKOUT;
      if (filter === "pending") return !state[m.id].finalized;
      return true;
    });
  }, [matches, filter, state]);

  function save() {
    const dirtyIds = [...dirty];
    const items = dirtyIds.map((id) => ({ matchId: id, ...state[id] }));
    if (items.length === 0) {
      toast("Պահպանելու փոփոխություններ չկան։", "info");
      return;
    }
    start(async () => {
      const res = await bulkSaveResults(items);
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) {
        setDirty(new Set());
        setState((prev) => {
          const next = { ...prev };
          for (const id of dirtyIds) {
            const s = next[id];
            const m = matches.find((x) => x.id === id);
            const isKO = m?.stage === STAGES.KNOCKOUT;
            const complete =
              s.normalHome !== null &&
              s.normalAway !== null &&
              (!isKO || s.winner !== null || resolveKnockoutWinner({
                normal: { home: s.normalHome, away: s.normalAway },
                extra: { home: s.extraHome, away: s.extraAway },
                penalty: { home: s.penaltyHome, away: s.penaltyAway },
                winner: s.winner,
              }) !== null);
            if (complete) next[id] = { ...s, finalized: true };
          }
          return next;
        });
      }
    });
  }

  const filters = [
    { id: "all", label: "Բոլորը" },
    { id: "group", label: "Խմբային" },
    { id: "knockout", label: "Փլեյ-օֆ" },
    { id: "pending", label: "Չավարտված" },
  ] as const;

  return (
    <div className="space-y-4 pb-savebar">
      <div className="flex flex-wrap gap-1.5 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition",
              filter === f.id ? "bg-gold-500/20 text-gold-400" : "bg-white/[0.03] text-navy-300 hover:bg-white/5",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((m) => (
          <ResultRow key={m.id} m={m} value={state[m.id]} onChange={(p) => patch(m.id, p)} />
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-950/90 backdrop-blur-xl bottom-bar-pad">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <span className="min-w-0 flex-1 truncate text-xs text-navy-300 sm:text-sm">
            {dirty.size > 0 ? (
              <>
                <span className="font-bold text-white">{dirty.size}</span> չպահպանված
              </>
            ) : (
              "Պահպանված է"
            )}
          </span>
          <Button onClick={save} loading={pending} disabled={dirty.size === 0} className="shrink-0">
            Պահպանել և վերահաշվարկել
          </Button>
        </div>
      </div>
    </div>
  );
}

function NumBox({
  value,
  onChange,
  small,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  small?: boolean;
}) {
  return (
    <input
      type="number"
      min={0}
      max={99}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))))}
      className={cn(
        "rounded-lg border border-white/10 bg-navy-900/80 text-center font-bold text-white outline-none focus:border-gold-400",
        small ? "h-10 w-10 text-sm" : "h-11 w-11",
      )}
    />
  );
}

function ResultRow({
  m,
  value,
  onChange,
}: {
  m: ResultDTO;
  value: State;
  onChange: (p: Partial<State>) => void;
}) {
  const isKO = m.stage === STAGES.KNOCKOUT;
  const derived = resolveKnockoutWinner({
    normal: { home: value.normalHome, away: value.normalAway },
    extra: { home: value.extraHome, away: value.extraAway },
    penalty: { home: value.penaltyHome, away: value.penaltyAway },
    winner: value.winner,
  });

  return (
    <div className={cn("glass p-3 sm:p-4", value.finalized && "border-pitch-500/30 bg-pitch-500/[0.04]")}>
      <div className="mb-2 flex items-center justify-between text-xs text-navy-400">
        <span>
          #{m.matchNumber} · {isKO ? ROUND_LABELS[(m.round as Round) ?? "R32"] : `Խումբ ${m.groupCode}`} ·{" "}
          {formatDateTime(m.scheduledAt)}
        </span>
        {value.finalized && <Badge variant="success">Ավարտված</Badge>}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <TeamChip name={m.homeName} seedLabel={m.homeSeedLabel} align="right" />
        <div className="flex items-center gap-1.5">
          <NumBox value={value.normalHome} onChange={(v) => onChange({ normalHome: v })} />
          <span className="text-navy-500">:</span>
          <NumBox value={value.normalAway} onChange={(v) => onChange({ normalAway: v })} />
        </div>
        <TeamChip name={m.awayName} seedLabel={m.awaySeedLabel} />
      </div>

      {isKO && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-navy-400">ԼՀ</span>
            <NumBox value={value.extraHome} onChange={(v) => onChange({ extraHome: v })} small />
            <NumBox value={value.extraAway} onChange={(v) => onChange({ extraAway: v })} small />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-navy-400">ՏՀ</span>
            <NumBox value={value.penaltyHome} onChange={(v) => onChange({ penaltyHome: v })} small />
            <NumBox value={value.penaltyAway} onChange={(v) => onChange({ penaltyAway: v })} small />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-navy-400">Անցնում է</span>
            <button
              type="button"
              onClick={() => onChange({ winner: "HOME" })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold",
                derived === "HOME" ? "border-pitch-500/50 bg-pitch-500/20 text-pitch-100" : "border-white/10 text-navy-300",
              )}
            >
              {m.homeName ?? m.homeSeedLabel ?? "Տան"}
            </button>
            <button
              type="button"
              onClick={() => onChange({ winner: "AWAY" })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold",
                derived === "AWAY" ? "border-pitch-500/50 bg-pitch-500/20 text-pitch-100" : "border-white/10 text-navy-300",
              )}
            >
              {m.awayName ?? m.awaySeedLabel ?? "Հյուր"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
