import { prisma } from "./prisma";
import { computeStandings, getActiveTournament } from "./standings";
import {
  getDeadlineMap,
  isMatchLocked,
  phaseForMatch,
  canRevealPredictions,
} from "./deadlines";
import { buildGroupTables } from "./group-tables";
import { buildPredictedAdvancing, buildQualifiersViz, averageQualifierPoints, type QualifiersViz } from "./qualifiers";
import type { GroupStandingRowDTO, MatchDTO } from "@/components/predictions/types";
import { POINTS, STAGES, TEAM_PICK_TYPES } from "./constants";

export interface MemberPredictionsData {
  user: { id: string; name: string; role: string };
  tournament: { id: string; knockoutPickCount: number; kickoffLockMinutes: number };
  groupMatches: MatchDTO[];
  knockoutMatches: MatchDTO[];
  standingsByGroup: Record<string, GroupStandingRowDTO[]>;
  teams: { id: string; name: string; groupCode: string | null }[];
  championPick: string | null;
  qualifiers: QualifiersViz;
  averageQualifierPoints: number | null;
  breakdown: {
    totalPoints: number;
    rank: number;
    groupStagePoints: number;
    knockoutStagePoints: number;
    knockoutTeamPoints: number;
    championPoints: number;
    exactScoreHits: number;
    correctOutcomes: number;
  } | null;
}

export async function getMemberPredictionsData(
  userId: string,
  options: { viewerIsAdmin: boolean },
): Promise<MemberPredictionsData | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const tournament = await getActiveTournament();

  const [matches, teams, picks, deadlines, standings] = await Promise.all([
    prisma.match.findMany({
      where: { tournamentId: tournament.id },
      include: {
        homeTeam: true,
        awayTeam: true,
        actualResult: true,
        predictions: { where: { userId } },
      },
      orderBy: { matchNumber: "asc" },
    }),
    prisma.team.findMany({
      where: { tournamentId: tournament.id },
      orderBy: [{ groupCode: "asc" }, { name: "asc" }],
    }),
    prisma.teamPick.findMany({ where: { userId, tournamentId: tournament.id } }),
    getDeadlineMap(tournament.id),
    computeStandings(tournament.id),
  ]);

  const matchPoints = standings.breakdownByUser[userId]?.matchPoints ?? {};
  const activePlayers = Object.keys(standings.breakdownByUser);
  const activePlayersCount = activePlayers.length || 1;

  const newMatchIds = new Set(
    matches
      .filter((m) => m.actualResult?.finalized)
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
      .slice(0, 4)
      .map((m) => m.id),
  );

  const toDTO = (m: (typeof matches)[number]): MatchDTO => {
    const pred = m.predictions[0] ?? null;
    const locked = isMatchLocked(m, tournament.kickoffLockMinutes);
    const actual = m.actualResult;
    const finalized = actual?.finalized ?? false;
    const revealed = canRevealPredictions(m, {
      isAdmin: options.viewerIsAdmin,
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
            extraHome: actual!.extraHomeGoals,
            extraAway: actual!.extraAwayGoals,
            penaltyHome: actual!.penaltyHomeGoals,
            penaltyAway: actual!.penaltyAwayGoals,
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

  const groupMatchesWithPred = matches
    .filter((m) => m.stage === STAGES.GROUP)
    .map((m) => ({
      groupCode: m.groupCode,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      pred: m.predictions[0] ?? null,
    }));
  const advancing = buildPredictedAdvancing(
    teams.map((t) => ({ id: t.id, name: t.name, groupCode: t.groupCode })),
    groupMatchesWithPred,
    (i) => {
      const p = groupMatchesWithPred[i].pred;
      return p ? { home: p.normalHomeGoals, away: p.normalAwayGoals } : null;
    },
  );
  const qualifiers = buildQualifiersViz(
    advancing,
    standings.actualQualifiedTeamIds,
    POINTS.TEAM_PICK,
  );

  const bd = standings.breakdownByUser[userId];
  const rankEntry = standings.leaderboard.find((e) => e.userId === userId);

  return {
    user: { id: user.id, name: user.name, role: user.role },
    tournament: {
      id: tournament.id,
      knockoutPickCount: tournament.knockoutPickCount,
      kickoffLockMinutes: tournament.kickoffLockMinutes,
    },
    groupMatches,
    knockoutMatches,
    standingsByGroup,
    teams: teams.map((t) => ({ id: t.id, name: t.name, groupCode: t.groupCode })),
    championPick: picks.find((p) => p.type === TEAM_PICK_TYPES.CHAMPION)?.teamId ?? null,
    qualifiers,
    averageQualifierPoints: averageQualifierPoints(
      standings.breakdownByUser,
      qualifiers.actualKnown,
    ),
    breakdown: bd
      ? {
          totalPoints: bd.totalPoints,
          rank: rankEntry?.rank ?? 0,
          groupStagePoints: bd.groupStagePoints,
          knockoutStagePoints: bd.knockoutStagePoints,
          knockoutTeamPoints: bd.knockoutTeamPoints,
          championPoints: bd.championPoints,
          exactScoreHits: bd.exactScoreHits,
          correctOutcomes: bd.correctOutcomes,
        }
      : null,
  };
}
