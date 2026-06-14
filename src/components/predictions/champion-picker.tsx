"use client";

import Link from "next/link";
import { TeamDTO } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { flagFor } from "@/lib/flags";

export function ChampionPicker({
  teams,
  current,
}: {
  teams: TeamDTO[];
  current: string | null;
  lock?: { locked: boolean; lockAt: string | null };
}) {
  const pick = teams.find((t) => t.id === current);

  return (
    <div className="space-y-4">
      <div className="glass p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-white">Your champion 🏆</h3>
            <p className="mt-1 text-sm text-navy-300">
              8 points if your champion wins the tournament. Champion picks are locked and cannot be changed.
            </p>
            <Link
              href="/champion"
              className="mt-2 inline-block text-sm font-semibold text-gold-400 hover:text-gold-300"
            >
              See crowd champion stats →
            </Link>
          </div>
          <Badge variant="muted">🔒 Locked</Badge>
        </div>
      </div>

      {pick ? (
        <div className="flex items-center gap-4 rounded-2xl border border-gold-500/40 bg-gold-500/10 p-5">
          <span className="text-5xl">{flagFor(pick.name)}</span>
          <div>
            <div className="font-display text-2xl font-bold text-white">{pick.name}</div>
            <div className="text-sm text-navy-300">Group {pick.groupCode}</div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <div className="text-4xl">🏆</div>
          <p className="mt-2 text-sm text-navy-300">No champion pick on your profile yet.</p>
        </div>
      )}
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
