"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { MatchDTO } from "./types";
import { ScoreInput } from "./score-input";
import { TeamChip } from "@/components/team-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { saveGroupPredictions } from "@/app/actions/predictions";
import { formatDateTime } from "@/lib/utils";

type Local = Record<string, { home: number | null; away: number | null }>;

export function GroupPredictions({ matches }: { matches: MatchDTO[] }) {
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
      toast("No changes to save.", "info");
      return;
    }
    start(async () => {
      const res = await saveGroupPredictions(items);
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) setDirty(new Set());
    });
  }

  return (
    <div className="space-y-6 pb-24">
      {groups.map(([code, list]) => (
        <div key={code}>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-display text-lg font-bold text-white">Group {code}</h3>
            <span className="text-xs text-navy-400">{list.length} matches</span>
          </div>
          <div className="space-y-2">
            {list.map((m) => (
              <MatchRow
                key={m.id}
                m={m}
                value={local[m.id]}
                onChange={(side, v) => update(m.id, side, v)}
              />
            ))}
          </div>
        </div>
      ))}

      <SaveBar count={dirty.size} pending={pending} onSave={save} />
    </div>
  );
}

function MatchRow({
  m,
  value,
  onChange,
}: {
  m: MatchDTO;
  value: { home: number | null; away: number | null };
  onChange: (side: "home" | "away", v: number | null) => void;
}) {
  const disabled = m.locked || m.actual !== null;
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
          {m.actual && (
            <Badge variant="info">
              Result {m.actual.normalHome}–{m.actual.normalAway}
            </Badge>
          )}
          {m.points !== null && <Badge variant="success">+{m.points} pts</Badge>}
          {m.locked && !m.actual && <Badge variant="muted">🔒 Locked</Badge>}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <TeamChip name={m.homeName} seedLabel={m.homeSeedLabel} align="right" />
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
        <TeamChip name={m.awayName} seedLabel={m.awaySeedLabel} />
      </div>
    </div>
  );
}

export function SaveBar({
  count,
  pending,
  onSave,
}: {
  count: number;
  pending: boolean;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm text-navy-300">
          {count > 0 ? (
            <>
              <span className="font-bold text-white">{count}</span> unsaved change
              {count === 1 ? "" : "s"}
            </>
          ) : (
            "All changes saved"
          )}
        </span>
        <Button onClick={onSave} loading={pending} disabled={count === 0}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
