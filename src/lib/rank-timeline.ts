import { prisma } from "./prisma";
import {
  scoreNormalPrediction,
  scoreKnockoutMatch,
  scoreTeamPicks,
  scoreChampionPick,
  calculateLeaderboard,
  knockoutInputFromGoals,
} from "./scoring";
import { buildPredictedAdvancing } from "./qualifiers";
import { STAGES, TEAM_PICK_TYPES } from "./constants";
import { syncChampionFromFinal } from "./bracket-engine";

export interface RankTimelinePoint {
  matchId: string;
  matchNumber: number;
  /** 1-based index among finalized games in chronological order. */
  gameIndex: number;
  label: string;
  ranksByUser: Record<string, number>;
}

interface Accumulator {
  userId: string;
  name: string;
  paid: boolean;
  groupStagePoints: number;
  knockoutStagePoints: number;
  knockoutTeamPoints: number;
  championPoints: number;
  exactScoreHits: number;
  complicatedExactScoreHits: number;
  correctOutcomes: number;
}

function applyScoring(acc: Accumulator, res: ReturnType<typeof scoreNormalPrediction>, isGroup: boolean) {
  if (res.exactScoreHit) acc.exactScoreHits += 1;
  if (res.complicatedExactScoreHit) acc.complicatedExactScoreHits += 1;
  if (res.correctOutcome) acc.correctOutcomes += 1;
  if (isGroup) acc.groupStagePoints += res.points;
  else acc.knockoutStagePoints += res.points;
}

function ranksFromAccumulators(
  accs: Accumulator[],
  tournament: { entryFee: number; prizeSplitJson: unknown },
  paidCount: number,
): Record<string, number> {
  const prizeSplit = (tournament.prizeSplitJson ?? {}) as Record<string, number>;
  const board = calculateLeaderboard(
    accs.map((a) => ({
      userId: a.userId,
      name: a.name,
      paid: a.paid,
      groupStagePoints: a.groupStagePoints,
      knockoutTeamPoints: a.knockoutTeamPoints,
      knockoutStagePoints: a.knockoutStagePoints,
      championPoints: a.championPoints,
      exactScoreHits: a.exactScoreHits,
      complicatedExactScoreHits: a.complicatedExactScoreHits,
      correctOutcomes: a.correctOutcomes,
    })),
    { entryFee: tournament.entryFee, prizeSplit, paidCount },
  );
  const ranks: Record<string, number> = {};
  for (const e of board) ranks[e.userId] = e.rank;
  return ranks;
}

/** Overall rank after each finalized match, chronologically from match #1. */
export async function computeRankTimeline(tournamentId: string): Promise<RankTimelinePoint[]> {
  await syncChampionFromFinal(tournamentId);

  const [tournament, users, matches, predictions, teamPicks, teamStatuses, teams] = await Promise.all([
    prisma.tournament.findUniqueOrThrow({ where: { id: tournamentId } }),
    prisma.user.findMany({ where: { role: "PLAYER", active: true } }),
    prisma.match.findMany({
      where: { tournamentId },
      include: { homeTeam: true, awayTeam: true, actualResult: true },
      orderBy: { matchNumber: "asc" },
    }),
    prisma.prediction.findMany({ where: { match: { tournamentId } } }),
    prisma.teamPick.findMany({ where: { tournamentId } }),
    prisma.actualTeamStatus.findMany({ where: { tournamentId } }),
    prisma.team.findMany({ where: { tournamentId } }),
  ]);

  const teamMeta = teams.map((t) => ({ id: t.id, name: t.name, groupCode: t.groupCode }));
  const groupMatchesMeta = matches
    .filter((m) => m.stage === STAGES.GROUP)
    .map((m) => ({
      id: m.id,
      groupCode: m.groupCode,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
    }));

  const finalized = matches
    .filter((m) => m.actualResult?.finalized)
    .sort((a, b) => a.matchNumber - b.matchNumber);
  const predsByUserMatch = new Map<string, (typeof predictions)[number]>();
  for (const p of predictions) predsByUserMatch.set(`${p.userId}:${p.matchId}`, p);

  const qualifiedTeamIds = teamStatuses.filter((t) => t.qualifiedToKnockout).map((t) => t.teamId);
  const championTeamId = teamStatuses.find((t) => t.champion)?.teamId ?? null;
  const paidCount = users.filter((u) => u.paid).length;

  const accs: Accumulator[] = users.map((user) => {
    const advancing = buildPredictedAdvancing(teamMeta, groupMatchesMeta, (i) => {
      const p = predsByUserMatch.get(`${user.id}:${groupMatchesMeta[i].id}`);
      if (!p) return null;
      return { home: p.normalHomeGoals, away: p.normalAwayGoals };
    });
    const userChampion = teamPicks.find(
      (tp) => tp.userId === user.id && tp.type === TEAM_PICK_TYPES.CHAMPION,
    );
    return {
      userId: user.id,
      name: user.name,
      paid: user.paid,
      groupStagePoints: 0,
      knockoutStagePoints: 0,
      knockoutTeamPoints: scoreTeamPicks(advancing.teamIds, qualifiedTeamIds),
      championPoints: scoreChampionPick(userChampion?.teamId ?? null, championTeamId),
      exactScoreHits: 0,
      complicatedExactScoreHits: 0,
      correctOutcomes: 0,
    };
  });

  const timeline: RankTimelinePoint[] = [];

  for (const match of finalized) {
    const actual = match.actualResult!;
    for (const acc of accs) {
      const pred = predsByUserMatch.get(`${acc.userId}:${match.id}`);
      if (!pred) continue;

      if (match.stage === STAGES.GROUP) {
        const res = scoreNormalPrediction(
          { home: pred.normalHomeGoals, away: pred.normalAwayGoals },
          { home: actual.normalHomeGoals, away: actual.normalAwayGoals },
        );
        applyScoring(acc, res, true);
      } else {
        const res = scoreKnockoutMatch(
          knockoutInputFromGoals(pred, pred.predictedWinnerTeamId, match.homeTeamId, match.awayTeamId),
          knockoutInputFromGoals(actual, actual.winnerTeamId, match.homeTeamId, match.awayTeamId),
        );
        applyScoring(acc, res, false);
      }
    }

    const home = match.homeTeam?.name ?? match.homeSeedLabel ?? "?";
    const away = match.awayTeam?.name ?? match.awaySeedLabel ?? "?";
    timeline.push({
      matchId: match.id,
      matchNumber: match.matchNumber,
      gameIndex: timeline.length + 1,
      label: `#${match.matchNumber} · ${home}–${away}`,
      ranksByUser: ranksFromAccumulators(accs, tournament, paidCount),
    });
  }

  return timeline;
}

export interface TimelinePlayer {
  userId: string;
  name: string;
}

export async function getTimelinePlayers(): Promise<TimelinePlayer[]> {
  const users = await prisma.user.findMany({
    where: { role: "PLAYER", active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return users.map((u) => ({ userId: u.id, name: u.name }));
}
