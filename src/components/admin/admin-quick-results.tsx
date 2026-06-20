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

export interface QuickResultMatch {
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
  normalHome: number | null;
  normalAway: number | null;
  extraHome: number | null;
  extraAway: number | null;
  penaltyHome: number | null;
  penaltyAway: number | null;
  winner: "HOME" | "AWAY" | null;
  finalized: boolean;
}

type Local = Record<
  string,
  {
    normalHome: number | null;
    normalAway: number | null;
    extraHome: number | null;
    extraAway: number | null;
    penaltyHome: number | null;
    penaltyAway: number | null;
    winner: "HOME" | "AWAY" | null;
  }
>;

type Filter = "all" | "pending" | "finished" | "group" | "knockout";

function initLocal(matches: QuickResultMatch[]): Local {
  const s: Local = {};
  for (const m of matches) {
    s[m.id] = {
      normalHome: m.normalHome,
      normalAway: m.normalAway,
      extraHome: m.extraHome,
      extraAway: m.extraAway,
      penaltyHome: m.penaltyHome,
      penaltyAway: m.penaltyAway,
      winner: m.winner,
    };
  }
  return s;
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
      onChange={(e) =>
        onChange(e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))))
      }
      className={cn(
        "rounded-lg border border-white/10 bg-navy-900/80 text-center font-bold text-white outline-none focus:border-gold-400",
        small ? "h-9 w-9 text-sm" : "h-10 w-10",
      )}
    />
  );
}

export function AdminQuickResults({ matches }: { matches: QuickResultMatch[] }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [local, setLocal] = useState<Local>(() => initLocal(matches));
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  function patch(id: string, p: Partial<Local[string]>) {
    setLocal((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));
    setDirty((prev) => new Set(prev).add(id));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matches.filter((m) => {
      if (filter === "pending" && m.finalized) return false;
      if (filter === "finished" && !m.finalized) return false;
      if (filter === "group" && m.stage !== STAGES.GROUP) return false;
      if (filter === "knockout" && m.stage !== STAGES.KNOCKOUT) return false;
      if (!q) return true;
      const hay = [m.homeName, m.awayName, m.homeSeedLabel, m.awaySeedLabel, String(m.matchNumber), m.groupCode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [matches, filter, query]);

  /** Group filtered matches by calendar day (Yerevan display date). */
  const byDay = useMemo(() => {
    const map = new Map<string, QuickResultMatch[]>();
    for (const m of filtered) {
      const day = formatDateTime(m.scheduledAt).split(",").slice(0, 2).join(",").trim();
      const arr = map.get(day) ?? [];
      arr.push(m);
      map.set(day, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  function save() {
    const ids = [...dirty];
    const items = ids.map((id) => ({ matchId: id, ...local[id] }));
    if (items.length === 0) {
      toast("Պահպանելու փոփոխություններ չկան։", "info");
      return;
    }
    start(async () => {
      const res = await bulkSaveResults(items);
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) setDirty(new Set());
    });
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center">
        <div className="text-3xl">✅</div>
        <p className="mt-2 text-sm font-semibold text-white">Մեկնարկած խաղեր չկան</p>
        <p className="mt-1 text-xs text-navy-400">Խաղը մեկնարկելուն պես այն կհայտնվի այստեղ։</p>
      </div>
    );
  }

  const pendingCount = matches.filter((m) => !m.finalized).length;
  const finishedCount = matches.filter((m) => m.finalized).length;

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: `Բոլորը (${matches.length})` },
    { id: "pending", label: `Սպասող (${pendingCount})` },
    { id: "finished", label: `Ավարտված (${finishedCount})` },
    { id: "group", label: "Խմբային" },
    { id: "knockout", label: "Փլեյ-օֆ" },
  ];

  return (
    <div className="space-y-4 pb-savebar">
      <p className="text-xs text-navy-400">
        Սխալ հաշիվ մուտքագրելու դեպքում փոխեք արդյունքը և սեղմեք «Պահպանել և վերահաշվարկել»։ Ավարտված խաղերն էլ կարելի է ուղղել։
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                filter === f.id ? "bg-gold-500/20 text-gold-400" : "bg-white/[0.03] text-navy-300 hover:bg-white/5",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Որոնել թիմ կամ խաղ №…"
          className="h-10 w-full rounded-xl border border-white/10 bg-navy-900/80 px-3 text-sm text-white outline-none placeholder:text-navy-500 focus:border-gold-400 sm:max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-navy-400">Որոնման արդյունք չկա։</p>
      ) : (
        byDay.map(([day, list]) => (
          <div key={day} className="space-y-2">
            <div className="sticky top-14 z-10 rounded-lg border border-white/10 bg-navy-950/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-navy-400 backdrop-blur">
              {day}
            </div>
            {list.map((m) => (
              <QuickResultRow
                key={m.id}
                m={m}
                value={local[m.id]}
                dirty={dirty.has(m.id)}
                onChange={(p) => patch(m.id, p)}
              />
            ))}
          </div>
        ))
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-950/90 backdrop-blur-xl bottom-bar-pad">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <span className="min-w-0 flex-1 truncate text-xs text-navy-300 sm:text-sm">
            {dirty.size > 0 ? (
              <>
                <span className="font-bold text-white">{dirty.size}</span> չպահպանված արդյունք
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

function QuickResultRow({
  m,
  value,
  dirty,
  onChange,
}: {
  m: QuickResultMatch;
  value: Local[string];
  dirty: boolean;
  onChange: (p: Partial<Local[string]>) => void;
}) {
  const isKO = m.stage === STAGES.KNOCKOUT;
  const stageLabel = isKO ? ROUND_LABELS[(m.round as Round) ?? "R32"] : `Խումբ ${m.groupCode}`;
  const derived = isKO
    ? resolveKnockoutWinner({
        normal: { home: value.normalHome, away: value.normalAway },
        extra: { home: value.extraHome, away: value.extraAway },
        penalty: { home: value.penaltyHome, away: value.penaltyAway },
        winner: value.winner,
      })
    : null;

  return (
    <div
      className={cn(
        "rounded-xl border p-3 sm:p-4",
        dirty
          ? "border-gold-500/35 bg-gold-500/[0.06]"
          : m.finalized
            ? "border-pitch-500/25 bg-pitch-500/[0.04]"
            : "border-amber-500/15 bg-amber-500/[0.03]",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-navy-400">
        <span>
          #{m.matchNumber} · {stageLabel} · {formatDateTime(m.scheduledAt)}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {m.finalized && <Badge variant="success">Ավարտված</Badge>}
          {dirty && <Badge variant="warning">Չպահպանված</Badge>}
        </div>
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
            <NumBox small value={value.extraHome} onChange={(v) => onChange({ extraHome: v })} />
            <NumBox small value={value.extraAway} onChange={(v) => onChange({ extraAway: v })} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-navy-400">ՏՀ</span>
            <NumBox small value={value.penaltyHome} onChange={(v) => onChange({ penaltyHome: v })} />
            <NumBox small value={value.penaltyAway} onChange={(v) => onChange({ penaltyAway: v })} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-navy-400">Անցնում է</span>
            <button
              type="button"
              onClick={() => onChange({ winner: "HOME" })}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-semibold",
                derived === "HOME" ? "border-pitch-500/50 bg-pitch-500/20 text-pitch-100" : "border-white/10 text-navy-300",
              )}
            >
              {m.homeName ?? m.homeSeedLabel ?? "Տ"}
            </button>
            <button
              type="button"
              onClick={() => onChange({ winner: "AWAY" })}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-semibold",
                derived === "AWAY" ? "border-pitch-500/50 bg-pitch-500/20 text-pitch-100" : "border-white/10 text-navy-300",
              )}
            >
              {m.awayName ?? m.awaySeedLabel ?? "Հ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
