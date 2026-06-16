import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTournament, computeStandings } from "@/lib/standings";
import {
  getDeadlineMap,
  isMatchLocked,
  phaseForMatch,
  canRevealPredictions,
} from "@/lib/deadlines";
import { buildGroupTables } from "@/lib/group-tables";
import { PredictionsTabs } from "@/components/predictions/predictions-tabs";
import type { GroupStandingRowDTO } from "@/components/predictions/types";
import { PHASES, STAGES, TEAM_PICK_TYPES, type Phase } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PredictionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const tournament = await getActiveTournament();
  const { tab } = await searchParams;
  const isAdmin = user.role === "ADMIN";

  const [matches, teams, picks, deadlines, standings] = await Promise.all([
    prisma.match.findMany({
      where: { tournamentId: tournament.id },
      include: {
        homeTeam: true,
        awayTeam: true,
        actualResult: true,
        predictions: { where: { userId: user.id } },
      },
      orderBy: { matchNumber: "asc" },
    }),
    prisma.team.findMany({
      where: { tournamentId: tournament.id },
      orderBy: [{ groupCode: "asc" }, { name: "asc" }],
    }),
    prisma.teamPick.findMany({ where: { userId: user.id, tournamentId: tournament.id } }),
    getDeadlineMap(tournament.id),
    computeStandings(tournament.id),
  ]);

  const matchPoints = standings.breakdownByUser[user.id]?.matchPoints ?? {};
  const activePlayers = Object.keys(standings.breakdownByUser);
  const activePlayersCount = activePlayers.length || 1;

  const newMatchIds = new Set(
    matches
      .filter((m) => m.actualResult?.finalized)
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
      .slice(0, 4)
      .map((m) => m.id),
  );

  const toDTO = (m: (typeof matches)[number]) => {
    const pred = m.predictions[0] ?? null;
    const locked = isMatchLocked(m, deadlines, tournament.kickoffLockMinutes);
    const actual = m.actualResult;
    const finalized = actual?.finalized ?? false;
    const revealed = canRevealPredictions(m, {
      isAdmin,
      kickoffLockMinutes: tournament.kickoffLockMinutes,
      deadlines,
    });

    let averagePoints: number | null = null;
    if (finalized) {
      let sum = 0;
      for (const uId of activePlayers) {
        sum += standings.breakdownByUser[uId]?.matchPoints[m.id] ?? 0;
      }
      averagePoints = Number((sum / activePlayersCount).toFixed(2));
    }

    return {
      id: m.id,
      matchNumber: m.matchNumber,
      stage: m.stage,
      round: m.round,
      groupCode: m.groupCode,
      scheduledAt: m.scheduledAt.toISOString(),
      homeName: m.homeTeam?.name ?? null,
      awayName: m.awayTeam?.name ?? null,
      homeSeedLabel: m.homeSeedLabel,
      awaySeedLabel: m.awaySeedLabel,
      locked,
      phase: phaseForMatch(m),
      pred: pred
        ? {
            normalHome: pred.normalHomeGoals,
            normalAway: pred.normalAwayGoals,
            extraHome: pred.extraHomeGoals,
            extraAway: pred.extraAwayGoals,
            penaltyHome: pred.penaltyHomeGoals,
            penaltyAway: pred.penaltyAwayGoals,
            winner:
              pred.predictedWinnerTeamId === m.homeTeamId && m.homeTeamId
                ? ("HOME" as const)
                : pred.predictedWinnerTeamId === m.awayTeamId && m.awayTeamId
                  ? ("AWAY" as const)
                  : null,
          }
        : null,
      actual: finalized
        ? {
            normalHome: actual!.normalHomeGoals,
            normalAway: actual!.normalAwayGoals,
          }
        : null,
      points: finalized ? (matchPoints[m.id] ?? 0) : null,
      averagePoints,
      revealed,
      isNew: newMatchIds.has(m.id),
    };
  };

  const groupMatches = matches.filter((m) => m.stage === STAGES.GROUP).map(toDTO);
  const knockoutMatches = matches.filter((m) => m.stage === STAGES.KNOCKOUT).map(toDTO);

  // Current group standings from finalized results (for round-3 context).
  const groupTables = buildGroupTables(
    teams.map((t) => ({ id: t.id, name: t.name, groupCode: t.groupCode })),
    matches.map((m) => ({
      groupCode: m.groupCode,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      result: m.actualResult
        ? {
            normalHomeGoals: m.actualResult.normalHomeGoals,
            normalAwayGoals: m.actualResult.normalAwayGoals,
            finalized: m.actualResult.finalized,
          }
        : null,
    })),
  );
  const standingsByGroup: Record<string, GroupStandingRowDTO[]> = {};
  for (const [code, table] of groupTables) {
    standingsByGroup[code] = table.rows.map((r) => ({
      teamId: r.teamId,
      teamName: r.teamName,
      played: r.played,
      won: r.won,
      drawn: r.drawn,
      lost: r.lost,
      gf: r.gf,
      ga: r.ga,
      gd: r.gd,
      points: r.points,
      rank: r.rank,
    }));
  }

  const championPick = picks.find((p) => p.type === TEAM_PICK_TYPES.CHAMPION)?.teamId ?? null;
  const qualifierPicks = picks
    .filter((p) => p.type === TEAM_PICK_TYPES.KNOCKOUT_QUALIFIER)
    .map((p) => p.teamId);

  const lockInfo = (phase: Phase) => {
    const d = deadlines.get(phase);
    return { locked: d?.locked ?? false, lockAt: d?.lockAt?.toISOString() ?? null };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white md:text-3xl">Իմ կանխատեսումները</h1>
        <p className="text-sm text-navy-300">
          Լրացրեք հաշիվները նախքան փուլերի փակվելը։ Միավորները կերևան, երբ խաղերի արդյունքները վերջնական հաստատվեն ադմինիստրատորի կողմից։
        </p>
      </div>

      <PredictionsTabs
        initialTab={tab}
        groupMatches={groupMatches}
        knockoutMatches={knockoutMatches}
        standingsByGroup={standingsByGroup}
        teams={teams.map((t) => ({ id: t.id, name: t.name, groupCode: t.groupCode }))}
        championPick={championPick}
        qualifierPicks={qualifierPicks}
        pickLimit={tournament.knockoutPickCount}
        championLock={lockInfo(PHASES.CHAMPION)}
        teamsLock={{ locked: false, lockAt: null }}
      />
    </div>
  );
}
