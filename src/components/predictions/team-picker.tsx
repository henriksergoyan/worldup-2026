"use client";

import { useMemo, useState, useTransition } from "react";
import { TeamDTO, LockInfo } from "./types";
import { SaveBarSimple } from "./champion-picker";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import { flagFor, translateTeam } from "@/lib/flags";
import { useToast } from "@/components/ui/toast";
import { setQualifierPicks } from "@/app/actions/predictions";

export function TeamPicker({
  teams,
  current,
  limit,
  lock,
}: {
  teams: TeamDTO[];
  current: string[];
  limit: number;
  lock: LockInfo;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set(current));

  const byGroup = useMemo(() => {
    const map = new Map<string, TeamDTO[]>();
    for (const t of teams) {
      const key = t.groupCode ?? "—";
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [teams]);

  function toggle(id: string) {
    if (lock.locked) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < limit) next.add(id);
      else {
        toast(`Կարող եք ընտրել առավելագույնը ${limit} թիմ:`, "error");
      }
      return next;
    });
  }

  function save() {
    start(async () => {
      const res = await setQualifierPicks([...selected]);
      toast(res.message, res.ok ? "success" : "error");
    });
  }

  return (
    <div className="space-y-4 pb-savebar">
      <div className="glass flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white">Փլեյ-օֆֆի մասնակիցներ 🎯</h3>
          <p className="text-sm text-navy-300">
            Ընտրեք այն թիմերին, որոնք կանցնեն խմբային փուլից: Յուրաքանչյուր ճիշտ գուշակման համար տրվում է 2 միավոր:{" "}
            {lock.locked ? (
              <Badge variant="muted">🔒 Կողպված է</Badge>
            ) : lock.lockAt ? (
              <span className="text-navy-400">Փակվում է՝ {formatDateTime(lock.lockAt)}</span>
            ) : null}
          </p>
        </div>
        <Badge variant={selected.size === limit ? "success" : "info"} className="text-sm">
          Ընտրված է {selected.size}/{limit} թիմ
        </Badge>
      </div>

      <div className="space-y-4">
        {byGroup.map(([code, list]) => (
          <div key={code}>
            <h4 className="mb-2 text-sm font-bold text-navy-200">Խումբ {code}</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {list.map((t) => {
                const active = selected.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={lock.locked}
                    onClick={() => toggle(t.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2.5 text-left transition",
                      active
                        ? "border-pitch-500/50 bg-pitch-500/15"
                        : "border-white/10 bg-white/[0.02] hover:border-white/25",
                      lock.locked && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <span className="text-lg">{flagFor(t.name)}</span>
                    <span className="min-w-0 truncate text-sm font-semibold text-white">{translateTeam(t.name)}</span>
                    {active && <span className="ml-auto text-pitch-300">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <SaveBarSimple
        pending={pending}
        onSave={save}
        disabled={lock.locked}
        label={`Ընտրված է ${selected.size}/${limit} թիմ`}
      />
    </div>
  );
}
