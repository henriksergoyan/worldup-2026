"use client";

import { useState } from "react";
import { MatchDTO, TeamDTO, LockInfo, GroupStandingRowDTO } from "./types";
import { GroupPredictions } from "./group-predictions";
import { KnockoutPredictions } from "./knockout-predictions";
import { ChampionPicker } from "./champion-picker";
import { PlayoffQualifiers } from "./playoff-qualifiers";
import type { QualifiersViz } from "@/lib/qualifiers";
import { cn } from "@/lib/utils";

type Tab = "group" | "qualifiers" | "knockout" | "champion";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "group", label: "Խմբային փուլ", icon: "🏟️" },
  { id: "qualifiers", label: "Անցում փլեյ-օֆֆ", icon: "🎟️" },
  { id: "knockout", label: "Փլեյ-օֆֆ", icon: "🥅" },
  { id: "champion", label: "Չեմպիոն", icon: "🏆" },
];

export function PredictionsTabs({
  initialTab,
  groupMatches,
  knockoutMatches,
  standingsByGroup,
  teams,
  championPick,
  qualifierPicks,
  pickLimit,
  championLock,
  teamsLock,
  qualifiers,
  averageQualifierPoints,
  readOnly = false,
  memberLabel,
  adminEditUserId,
}: {
  initialTab?: string;
  groupMatches: MatchDTO[];
  knockoutMatches: MatchDTO[];
  standingsByGroup: Record<string, GroupStandingRowDTO[]>;
  teams: TeamDTO[];
  championPick: string | null;
  qualifierPicks: string[];
  pickLimit: number;
  championLock: LockInfo;
  teamsLock: LockInfo;
  qualifiers?: QualifiersViz;
  averageQualifierPoints?: number | null;
  readOnly?: boolean;
  memberLabel?: string;
  adminEditUserId?: string;
}) {
  const [tab, setTab] = useState<Tab>(
    (TABS.find((t) => t.id === initialTab)?.id ?? "group") as Tab,
  );

  return (
    <div>
      <div className="sticky top-16 z-30 mb-5 flex gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-navy-950/90 p-1.5 backdrop-blur-xl">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-semibold transition sm:text-sm",
              tab === t.id ? "bg-pitch-500/20 text-pitch-100" : "text-navy-300 hover:bg-white/5",
            )}
          >
            <span className="text-base">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "group" && (
        <GroupPredictions
          matches={groupMatches}
          standingsByGroup={standingsByGroup}
          readOnly={readOnly}
          memberLabel={memberLabel}
          adminEditUserId={adminEditUserId}
        />
      )}
      {tab === "qualifiers" && qualifiers && (
        <PlayoffQualifiers viz={qualifiers} averagePoints={averageQualifierPoints ?? null} />
      )}
      {tab === "knockout" && (
        <KnockoutPredictions
          matches={knockoutMatches}
          readOnly={readOnly}
          memberLabel={memberLabel}
          adminEditUserId={adminEditUserId}
        />
      )}
      {tab === "champion" && (
        <ChampionPicker teams={teams} current={championPick} lock={championLock} readOnly={readOnly} />
      )}
    </div>
  );
}
