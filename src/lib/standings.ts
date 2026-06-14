import { prisma } from "./prisma";
import {
  scoreNormalPrediction,
  scoreKnockoutMatch,
  scoreTeamPicks,
  scoreChampionPick,
  calculateLeaderboard,
  type ScoringResult,
  type LeaderboardEntry,
  type Side,
} from "./scoring";
import { STAGES, TEAM_PICK_TYPES } from "./constants";

export interface PlayerBreakdown {
  userId: string;
  name: string;
  paid: boolean;
  groupStagePoints: number;
  knockoutStagePoints: number;
  knockoutTeamPoints: number;
  championPoints: number;
  totalPoints: number;
  exactScoreHits: number;
  complicatedExactScoreHits: number;
  correctOutcomes: number;
  qualifyingWinnerHits: number;
  predictionsMade: number;
  // matchId -> points earned (for finalized matches)
  matchPoints: Record<string, number>;
}

export interface StandingsResult {
  leaderboard: LeaderboardEntry[];
  breakdownByUser: Record<string, PlayerBreakdown>;
  prizePool: number;
  paidCount: number;
}

function sideFromTeamId(
  teamId: string | null | undefined,
  homeTeamId: string | null,
  awayTeamId: string | null,
): Side | null {
  if (!teamId) return null;
  if (teamId === homeTeamId) return "HOME";
  if (teamId === awayTeamId) return "AWAY";
  return null;
}

/**
 * Compute the full standings (leaderboard + per-player breakdown) for a
 * tournament from finalized results, predictions, team picks and champion picks.
 * Pure-ish: reads the DB then delegates all math to the scoring engine.
 */
export async function computeStandings(tournamentId: string): Promise<StandingsResult> {
  const [tournament, users, matches, predictions, teamPicks, teamStatuses] =
    await Promise.all([
      prisma.tournament.findUniqueOrThrow({ where: { id: tournamentId } }),
      prisma.user.findMany({ where: { role: "PLAYER", active: true } }),
      prisma.match.findMany({
        where: { tournamentId },
        include: { actualResult: true },
      }),
      prisma.prediction.findMany({
        where: { match: { tournamentId } },
      }),
      prisma.teamPick.findMany({ where: { tournamentId } }),
      prisma.actualTeamStatus.findMany({ where: { tournamentId } }),
    ]);

  const matchById = new Map(matches.map((m) => [m.id, m]));
  const predsByUser = new Map<string, typeof predictions>();
  for (const p of predictions) {
    const arr = predsByUser.get(p.userId) ?? [];
    arr.push(p);
    predsByUser.set(p.userId, arr);
  }

  const qualifiedTeamIds = teamStatuses
    .filter((t) => t.qualifiedToKnockout)
    .map((t) => t.teamId);
  const championTeamId = teamStatuses.find((t) => t.champion)?.teamId ?? null;

  const prizeSplit = (tournament.prizeSplitJson ?? {}) as Record<string, number>;
  const paidCount = users.filter((u) => u.paid).length;
  const prizePool = tournament.entryFee * paidCount;

  const breakdowns: PlayerBreakdown[] = users.map((user) => {
    const preds = predsByUser.get(user.id) ?? [];
    const bd: PlayerBreakdown = {
      userId: user.id,
      name: user.name,
      paid: user.paid,
      groupStagePoints: 0,
      knockoutStagePoints: 0,
      knockoutTeamPoints: 0,
      championPoints: 0,
      totalPoints: 0,
      exactScoreHits: 0,
      complicatedExactScoreHits: 0,
      correctOutcomes: 0,
      qualifyingWinnerHits: 0,
      predictionsMade: 0,
      matchPoints: {},
    };

    for (const pred of preds) {
      const match = matchById.get(pred.matchId);
      if (!match) continue;
      if (pred.normalHomeGoals !== null || pred.normalAwayGoals !== null) {
        bd.predictionsMade += 1;
      }
      const actual = match.actualResult;
      if (!actual || !actual.finalized) continue;

      if (match.stage === STAGES.GROUP) {
        const res = scoreNormalPrediction(
          { home: pred.normalHomeGoals, away: pred.normalAwayGoals },
          { home: actual.normalHomeGoals, away: actual.normalAwayGoals },
        );
        applyResult(bd, res, match.id);
        bd.groupStagePoints += res.points;
      } else {
        const res = scoreKnockoutMatch(
          {
            normal: { home: pred.normalHomeGoals, away: pred.normalAwayGoals },
            extra: { home: pred.extraHomeGoals, away: pred.extraAwayGoals },
            penalty: { home: pred.penaltyHomeGoals, away: pred.penaltyAwayGoals },
            winner: sideFromTeamId(pred.predictedWinnerTeamId, match.homeTeamId, match.awayTeamId),
          },
          {
            normal: { home: actual.normalHomeGoals, away: actual.normalAwayGoals },
            extra: { home: actual.extraHomeGoals, away: actual.extraAwayGoals },
            penalty: { home: actual.penaltyHomeGoals, away: actual.penaltyAwayGoals },
            winner: sideFromTeamId(actual.winnerTeamId, match.homeTeamId, match.awayTeamId),
          },
        );
        applyResult(bd, res, match.id);
        if (res.qualifyingWinnerHit) bd.qualifyingWinnerHits += 1;
        bd.knockoutStagePoints += res.points;
      }
    }

    // Team picks (knockout qualifiers)
    const userQualifierPicks = teamPicks
      .filter((tp) => tp.userId === user.id && tp.type === TEAM_PICK_TYPES.KNOCKOUT_QUALIFIER)
      .map((tp) => tp.teamId);
    bd.knockoutTeamPoints = scoreTeamPicks(userQualifierPicks, qualifiedTeamIds);

    // Champion pick
    const userChampion = teamPicks.find(
      (tp) => tp.userId === user.id && tp.type === TEAM_PICK_TYPES.CHAMPION,
    );
    bd.championPoints = scoreChampionPick(userChampion?.teamId ?? null, championTeamId);

    bd.totalPoints =
      bd.groupStagePoints +
      bd.knockoutStagePoints +
      bd.knockoutTeamPoints +
      bd.championPoints;

    return bd;
  });

  const leaderboard = calculateLeaderboard(
    breakdowns.map((b) => ({
      userId: b.userId,
      name: b.name,
      paid: b.paid,
      groupStagePoints: b.groupStagePoints,
      knockoutTeamPoints: b.knockoutTeamPoints,
      knockoutStagePoints: b.knockoutStagePoints,
      championPoints: b.championPoints,
      exactScoreHits: b.exactScoreHits,
      complicatedExactScoreHits: b.complicatedExactScoreHits,
      correctOutcomes: b.correctOutcomes,
    })),
    { entryFee: tournament.entryFee, prizeSplit, paidCount },
  );

  const breakdownByUser: Record<string, PlayerBreakdown> = {};
  for (const b of breakdowns) breakdownByUser[b.userId] = b;

  return { leaderboard, breakdownByUser, prizePool, paidCount };
}

function applyResult(bd: PlayerBreakdown, res: ScoringResult, matchId: string) {
  bd.matchPoints[matchId] = res.points;
  if (res.exactScoreHit) bd.exactScoreHits += 1;
  if (res.complicatedExactScoreHit) bd.complicatedExactScoreHits += 1;
  if (res.correctOutcome) bd.correctOutcomes += 1;
}

/** Convenience: the single active tournament (MVP assumes one). */
export async function getActiveTournament() {
  return prisma.tournament.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
}
