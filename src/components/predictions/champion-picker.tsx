"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { TeamDTO, LockInfo } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatDateTime } from "@/lib/utils";
import { flagFor } from "@/lib/flags";
import { useToast } from "@/components/ui/toast";
import { setChampion } from "@/app/actions/predictions";

export function ChampionPicker({
  teams,
  current,
  lock,
}: {
  teams: TeamDTO[];
  current: string | null;
  lock: LockInfo;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string | null>(current);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => teams.filter((t) => t.name.toLowerCase().includes(query.toLowerCase())),
    [teams, query],
  );

  function save() {
    start(async () => {
      const res = await setChampion(selected);
      toast(res.message, res.ok ? "success" : "error");
    });
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="glass flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white">Pick your champion 🏆</h3>
          <p className="text-sm text-navy-300">
            8 points if your champion wins the tournament.{" "}
            {lock.locked ? (
              <Badge variant="muted">🔒 Locked</Badge>
            ) : lock.lockAt ? (
              <span className="text-navy-400">Locks {formatDateTime(lock.lockAt)}</span>
            ) : null}
          </p>
          <Link href="/champion" className="mt-1 inline-block text-sm font-semibold text-gold-400 hover:text-gold-300">
            See crowd champion stats →
          </Link>
        </div>
        <Input
          placeholder="Search team…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-56"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((t) => {
          const active = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              disabled={lock.locked}
              onClick={() => setSelected(active ? null : t.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border p-3 text-left transition",
                active
                  ? "border-gold-500/50 bg-gold-500/15 shadow-glow"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25",
                lock.locked && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="text-xl">{flagFor(t.name)}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">{t.name}</span>
                <span className="text-xs text-navy-400">Group {t.groupCode}</span>
              </span>
              {active && <span className="ml-auto text-gold-400">★</span>}
            </button>
          );
        })}
      </div>

      <SaveBarSimple
        pending={pending}
        onSave={save}
        disabled={lock.locked}
        label={selected ? `Champion: ${teams.find((t) => t.id === selected)?.name}` : "No champion selected"}
      />
    </div>
  );
}

export function SaveBarSimple({
  pending,
  onSave,
  disabled,
  label,
}: {
  pending: boolean;
  onSave: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <span className="truncate text-sm text-navy-300">{label}</span>
        <Button onClick={onSave} loading={pending} disabled={disabled}>
          Save
        </Button>
      </div>
    </div>
  );
}
