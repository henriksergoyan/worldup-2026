"use client";

import Link from "next/link";
import { TeamDTO } from "./types";
import { Badge } from "@/components/ui/badge";
import { flagFor, translateTeam } from "@/lib/flags";

export function ChampionPicker({
  teams,
  current,
  readOnly = false,
}: {
  teams: TeamDTO[];
  current: string | null;
  readOnly?: boolean;
}) {
  const pick = teams.find((t) => t.id === current);

  return (
    <div className="space-y-4">
      <div className="glass p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-white">
              {readOnly ? "Չեմպիոնի կանխատեսում 🏆" : "Քո չեմպիոնը 🏆"}
            </h3>
            <p className="mt-1 text-sm text-navy-300">
              8 միավոր, եթե ձեր ընտրած թիմը դառնա չեմպիոն: Չեմպիոնի ընտրությունն արդեն կողպված է:
            </p>
            <Link
              href="/champion"
              className="mt-2 inline-block text-sm font-semibold text-gold-400 hover:text-gold-300"
            >
              Տեսնել բոլորի ընտրությունները 🏆 →
            </Link>
          </div>
          <Badge variant="muted">🔒 Կողպված է</Badge>
        </div>
      </div>

      {pick ? (
        <div className="flex items-center gap-4 rounded-2xl border border-gold-500/40 bg-gold-500/10 p-5">
          <span className="text-5xl">{flagFor(pick.name)}</span>
          <div>
            <div className="font-display text-2xl font-bold text-white">{translateTeam(pick.name)}</div>
            <div className="text-sm text-navy-300">Խումբ {pick.groupCode}</div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <div className="text-4xl">🏆</div>
          <p className="mt-2 text-sm text-navy-300">Չեմպիոնի ընտրություն չի կատարվել:</p>
        </div>
      )}
    </div>
  );
}
