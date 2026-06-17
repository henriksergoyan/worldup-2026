import { prisma } from "./prisma";
import {
  scoreNormalPrediction,
  scoreKnockoutMatch,
  scoreTeamPicks,
  scoreChampionPick,
  calculateLeaderboard,
  type Side,
  type LeaderboardInput,
} from "./scoring";
import { STAGES, TEAM_PICK_TYPES } from "./constants";

export interface RankOutlookSummary {
  currentRank: number;
  currentPoints: number;
  bestRank: number;
  worstRank: number;
  bestPoints: number;
  worstPoints: number;
  pendingMatches: number;
}

export interface UpcomingMatchOutlook {
  matchId: string;
  matchNumber: number;
  label: string;
  scheduledAt: string;
  prediction: string | null;
  maxPoints: number;
  rankIfHits: number;
  rankIfMisses: number;
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

function scoreMatchForUser(
  match: {
    stage: string;
    homeTeamId: string | null;
    awayTeamId: string | null;
  },
  pred: {
    normalHomeGoals: number | null;
    normalAwayGoals: number | null;
    extraHomeGoals: number | null;
    extraAwayGoals: number | null;
    penaltyHomeGoals: number | null;
    penaltyAwayGoals: number | null;
    predictedWinnerTeamId: string | null;
  } | undefined,
  actualNormal: { home: number; away: number },
  actualExtra?: { home: number; away: number } | null,
  actualPenalty?: { home: number; away: number } | null,
  actualWinner?: Side | null,
): { points: number; exact: boolean; complicated: boolean; correct: boolean } {
  if (!pred) return { points: 0, exact: false, complicated: false, correct: false };

  if (match.stage === STAGES.GROUP) {
    const res = scoreNormalPrediction(
      { home: pred.normalHomeGoals, away: pred.normalAwayGoals },
      actualNormal,
    );
    return {
      points: res.points,
      exact: res.exactScoreHit,
      complicated: res.complicatedExactScoreHit,
      correct: res.correctOutcome,
    };
  }

  const res = scoreKnockoutMatch(
    {
      normal: { home: pred.normalHomeGoals, away: pred.normalAwayGoals },
      extra: { home: pred.extraHomeGoals, away: pred.extraAwayGoals },
      penalty: { home: pred.penaltyHomeGoals, away: pred.penaltyAwayGoals },
      winner: sideFromTeamId(pred.predictedWinnerTeamId, match.homeTeamId, match.awayTeamId),
    },
    {
      normal: actualNormal,
      extra: actualExtra ?? undefined,
      penalty: actualPenalty ?? undefined,
      winner: actualWinner ?? undefined,
    },
  );
  return {
    points: res.points,
    exact: res.exactScoreHit,
    complicated: res.complicatedExactScoreHit,
    correct: res.correctOutcome,
  };
}

function buildLeaderboardInputs(
  users: { id: string; name: string; paid: boolean }[],
  base: Map<
    string,
    {
      group: number;
      knockout: number;
      knockoutTeam: number;
      champion: number;
      exact: number;
      complicated: number;
      correct: number;
    }
  >,
): LeaderboardInput[] {
  return users.map((u) => {
    const b = base.get(u.id)!;
    return {
      userId: u.id,
      name: u.name,
      paid: u.paid,
      groupStagePoints: b.group,
      knockoutStagePoints: b.knockout,
      knockoutTeamPoints: b.knockoutTeam,
      championPoints: b.champion,
      exactScoreHits: b.exact,
      complicatedExactScoreHits: b.complicated,
      correctOutcomes: b.correct,
    };
  });
}

function rankForUser(
  board: ReturnType<typeof calculateLeaderboard>,
  userId: string,
): number {
  return board.find((e) => e.userId === userId)?.rank ?? board.length;
}

/** Best/worst rank scenarios for a player on upcoming (unfinalized) matches. */
export async function computeRankOutlook(
  tournamentId: string,
  userId: string,
): Promise<{ summary: RankOutlookSummary; upcoming: UpcomingMatchOutlook[] } | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const [tournament, users, matches, predictions, teamPicks, teamStatuses] = await Promise.all([
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
  ]);

  const qualifiedTeamIds = teamStatuses.filter((t) => t.qualifiedToKnockout).map((t) => t.teamId);
  const championTeamId = teamStatuses.find((t) => t.champion)?.teamId ?? null;
  const paidCount = users.filter((u) => u.paid).length;
  const prizeSplit = (tournament.prizeSplitJson ?? {}) as Record<string, number>;
  const prizeOpts = { entryFee: tournament.entryFee, prizeSplit, paidCount };

  const predsByUserMatch = new Map<string, (typeof predictions)[number]>();
  for (const p of predictions) predsByUserMatch.set(`${p.userId}:${p.matchId}`, p);

  type Base = {
    group: number;
    knockout: number;
    knockoutTeam: number;
    champion: number;
    exact: number;
    complicated: number;
    correct: number;
  };

  const base = new Map<string, Base>();

  for (const u of users) {
    const userQualifierPicks = teamPicks
      .filter((tp) => tp.userId === u.id && tp.type === TEAM_PICK_TYPES.KNOCKOUT_QUALIFIER)
      .map((tp) => tp.teamId);
    const userChampion = teamPicks.find(
      (tp) => tp.userId === u.id && tp.type === TEAM_PICK_TYPES.CHAMPION,
    );
    base.set(u.id, {
      group: 0,
      knockout: 0,
      knockoutTeam: scoreTeamPicks(userQualifierPicks, qualifiedTeamIds),
      champion: scoreChampionPick(userChampion?.teamId ?? null, championTeamId),
      exact: 0,
      complicated: 0,
      correct: 0,
    });
  }

  const finalized = matches.filter((m) => m.actualResult?.finalized);
  const pending = matches.filter((m) => !m.actualResult?.finalized);

  for (const match of finalized) {
    const actual = match.actualResult!;
    for (const u of users) {
      const pred = predsByUserMatch.get(`${u.id}:${match.id}`);
      const b = base.get(u.id)!;
      const actualNormal = {
        home: actual.normalHomeGoals!,
        away: actual.normalAwayGoals!,
      };
      const scored = scoreMatchForUser(
        match,
        pred,
        actualNormal,
        actual.extraHomeGoals != null && actual.extraAwayGoals != null
          ? { home: actual.extraHomeGoals, away: actual.extraAwayGoals }
          : null,
        actual.penaltyHomeGoals != null && actual.penaltyAwayGoals != null
          ? { home: actual.penaltyHomeGoals, away: actual.penaltyAwayGoals }
          : null,
        sideFromTeamId(actual.winnerTeamId, match.homeTeamId, match.awayTeamId),
      );
      if (match.stage === STAGES.GROUP) b.group += scored.points;
      else b.knockout += scored.points;
      if (scored.exact) b.exact += 1;
      if (scored.complicated) b.complicated += 1;
      if (scored.correct) b.correct += 1;
    }
  }

  const currentBoard = calculateLeaderboard(buildLeaderboardInputs(users, base), prizeOpts);
  const currentRank = rankForUser(currentBoard, userId);
  const currentPoints = currentBoard.find((e) => e.userId === userId)?.totalPoints ?? 0;

  // Best case: user's predictions come true; others scored against same actuals.
  const bestBase = new Map<string, Base>();
  for (const [id, b] of base) bestBase.set(id, { ...b });

  for (const match of pending) {
    const focusPred = predsByUserMatch.get(`${userId}:${match.id}`);
    if (!focusPred || focusPred.normalHomeGoals === null || focusPred.normalAwayGoals === null) continue;

    const actualNormal = {
      home: focusPred.normalHomeGoals!,
      away: focusPred.normalAwayGoals!,
    };

    for (const u of users) {
      const pred = predsByUserMatch.get(`${u.id}:${match.id}`);
      const b = bestBase.get(u.id)!;
      const scored = scoreMatchForUser(match, pred, actualNormal);
      if (match.stage === STAGES.GROUP) b.group += scored.points;
      else b.knockout += scored.points;
      if (scored.exact) b.exact += 1;
      if (scored.complicated) b.complicated += 1;
      if (scored.correct) b.correct += 1;
    }
  }

  const bestBoard = calculateLeaderboard(buildLeaderboardInputs(users, bestBase), prizeOpts);
  const bestRank = rankForUser(bestBoard, userId);
  const bestPoints = bestBoard.find((e) => e.userId === userId)?.totalPoints ?? currentPoints;

  // Worst case: user gets 0 on pending matches; others get max (prediction = actual).
  const worstBase = new Map<string, Base>();
  for (const [id, b] of base) worstBase.set(id, { ...b });

  for (const match of pending) {
    for (const u of users) {
      const pred = predsByUserMatch.get(`${u.id}:${match.id}`);
      const b = worstBase.get(u.id)!;
      if (u.id === userId) continue;
      if (!pred || pred.normalHomeGoals === null || pred.normalAwayGoals === null) continue;

      const actualNormal = { home: pred.normalHomeGoals!, away: pred.normalAwayGoals! };
      const scored = scoreMatchForUser(match, pred, actualNormal);
      if (match.stage === STAGES.GROUP) b.group += scored.points;
      else b.knockout += scored.points;
      if (scored.exact) b.exact += 1;
      if (scored.complicated) b.complicated += 1;
      if (scored.correct) b.correct += 1;
    }
  }

  const worstBoard = calculateLeaderboard(buildLeaderboardInputs(users, worstBase), prizeOpts);
  const worstRank = rankForUser(worstBoard, userId);
  const worstPoints = worstBoard.find((e) => e.userId === userId)?.totalPoints ?? currentPoints;

  const upcoming: UpcomingMatchOutlook[] = [];

  for (const match of pending) {
    const focusPred = predsByUserMatch.get(`${userId}:${match.id}`);
    const hasPred =
      focusPred &&
      focusPred.normalHomeGoals !== null &&
      focusPred.normalAwayGoals !== null;

    if (!hasPred) continue;

    const actualNormal = {
      home: focusPred!.normalHomeGoals!,
      away: focusPred!.normalAwayGoals!,
    };
    const maxScored = scoreMatchForUser(match, focusPred, actualNormal);

    const singleBest = new Map<string, Base>();
    for (const [id, b] of base) singleBest.set(id, { ...b });
    for (const u of users) {
      const pred = predsByUserMatch.get(`${u.id}:${match.id}`);
      const b = singleBest.get(u.id)!;
      const scored = scoreMatchForUser(match, pred, actualNormal);
      if (match.stage === STAGES.GROUP) b.group += scored.points;
      else b.knockout += scored.points;
      if (scored.exact) b.exact += 1;
      if (scored.complicated) b.complicated += 1;
      if (scored.correct) b.correct += 1;
    }
    const hitBoard = calculateLeaderboard(buildLeaderboardInputs(users, singleBest), prizeOpts);

    const singleWorst = new Map<string, Base>();
    for (const [id, b] of base) singleWorst.set(id, { ...b });
    for (const u of users) {
      if (u.id === userId) continue;
      const pred = predsByUserMatch.get(`${u.id}:${match.id}`);
      const b = singleWorst.get(u.id)!;
      if (!pred || pred.normalHomeGoals === null || pred.normalAwayGoals === null) continue;
      const scored = scoreMatchForUser(match, pred, {
        home: pred.normalHomeGoals!,
        away: pred.normalAwayGoals!,
      });
      if (match.stage === STAGES.GROUP) b.group += scored.points;
      else b.knockout += scored.points;
      if (scored.exact) b.exact += 1;
      if (scored.complicated) b.complicated += 1;
      if (scored.correct) b.correct += 1;
    }
    const missBoard = calculateLeaderboard(buildLeaderboardInputs(users, singleWorst), prizeOpts);

    const home = match.homeTeam?.name ?? match.homeSeedLabel ?? "?";
    const away = match.awayTeam?.name ?? match.awaySeedLabel ?? "?";

    upcoming.push({
      matchId: match.id,
      matchNumber: match.matchNumber,
      label: `#${match.matchNumber} · ${home} vs ${away}`,
      scheduledAt: match.scheduledAt.toISOString(),
      prediction: `${focusPred!.normalHomeGoals}–${focusPred!.normalAwayGoals}`,
      maxPoints: maxScored.points,
      rankIfHits: rankForUser(hitBoard, userId),
      rankIfMisses: rankForUser(missBoard, userId),
    });
  }

  return {
    summary: {
      currentRank,
      currentPoints,
      bestRank,
      worstRank,
      bestPoints,
      worstPoints,
      pendingMatches: pending.length,
    },
    upcoming,
  };
}
