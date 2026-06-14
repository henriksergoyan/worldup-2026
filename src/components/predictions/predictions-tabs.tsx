"use client";

import { useState } from "react";
import { MatchDTO, TeamDTO, LockInfo } from "./types";
import { GroupPredictions } from "./group-predictions";
import { KnockoutPredictions } from "./knockout-predictions";
import { ChampionPicker } from "./champion-picker";
import { TeamPicker } from "./team-picker";
import { cn } from "@/lib/utils";

type Tab = "group" | "knockout" | "champion";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "group", label: "Խմբային փուլ", icon: "🏟️" },
  { id: "knockout", label: "Փլեյ-օֆֆ", icon: "🥅" },
  { id: "champion", label: "Չեմպիոն 🏆", icon: "🏆" },
];

export function PredictionsTabs({
  initialTab,
  groupMatches,
  knockoutMatches,
  teams,
  championPick,
  qualifierPicks,
  pickLimit,
  championLock,
  teamsLock,
}: {
  initialTab?: string;
  groupMatches: MatchDTO[];
  knockoutMatches: MatchDTO[];
  teams: TeamDTO[];
  championPick: string | null;
  qualifierPicks: string[];
  pickLimit: number;
  championLock: LockInfo;
  teamsLock: LockInfo;
}) {
  const [tab, setTab] = useState<Tab>(
    (TABS.find((t) => t.id === initialTab)?.id ?? "group") as Tab,
  );

  return (
    <div>
      <div className="mb-5 flex gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition",
              tab === t.id ? "bg-pitch-500/20 text-pitch-100" : "text-navy-300 hover:bg-white/5",
            )}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "group" && <GroupPredictions matches={groupMatches} />}
      {tab === "knockout" && <KnockoutPredictions matches={knockoutMatches} />}
      {tab === "champion" && (
        <ChampionPicker teams={teams} current={championPick} lock={championLock} />
      )}
    </div>
  );
}
