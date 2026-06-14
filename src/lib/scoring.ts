// Pure scoring engine for the World Cup 2026 prediction game.
//
// Every function here is side-effect free and fully unit-tested. The rest of the
// app (server actions, leaderboard, admin recalculation) builds on these.

import { POINTS } from "./constants";

export type Outcome = "1" | "X" | "2";

export interface ScoreInput {
  home: number | null | undefined;
  away: number | null | undefined;
}

export interface ScoringResult {
  points: number;
  reason: string;
  exactScoreHit: boolean;
  complicatedExactScoreHit: boolean;
  correctOutcome: boolean;
  qualifyingWinnerHit: boolean;
}

function emptyResult(reason: string): ScoringResult {
  return {
    points: 0,
    reason,
    exactScoreHit: false,
    complicatedExactScoreHit: false,
    correctOutcome: false,
    qualifyingWinnerHit: false,
  };
}

function isNum(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function bothPresent(s: ScoreInput): s is { home: number; away: number } {
  return isNum(s.home) && isNum(s.away);
}

/** Outcome from a (home, away) score: "1" home win, "X" draw, "2" away win. */
export function getOutcome(homeGoals: number, awayGoals: number): Outcome {
  if (homeGoals > awayGoals) return "1";
  if (homeGoals < awayGoals) return "2";
  return "X";
}

/**
 * A "complicated" exact score is any score where the total goals are 4 or more,
 * OR the absolute goal difference is 3 or more (e.g. 3-0, 2-2, 4-1).
 */
export function isComplicatedScore(homeGoals: number, awayGoals: number): boolean {
  const total = homeGoals + awayGoals;
  const diff = Math.abs(homeGoals - awayGoals);
  return total >= 4 || diff >= 3;
}

/**
 * Score a normal (90-minute / group-stage style) prediction.
 *  - 0 if actual missing or outcome wrong
 *  - 3 for correct outcome only
 *  - 5 for exact score
 *  - 6 for complicated exact score
 */
export function scoreNormalPrediction(
  prediction: ScoreInput,
  actual: ScoreInput,
): ScoringResult {
  if (!bothPresent(actual)) return emptyResult("Actual score not entered yet");
  if (!bothPresent(prediction)) return emptyResult("No prediction submitted");

  const predOutcome = getOutcome(prediction.home, prediction.away);
  const actualOutcome = getOutcome(actual.home, actual.away);

  if (predOutcome !== actualOutcome) {
    return emptyResult("Wrong outcome");
  }

  const exact = prediction.home === actual.home && prediction.away === actual.away;
  if (!exact) {
    return {
      ...emptyResult("Correct outcome"),
      points: POINTS.CORRECT_OUTCOME,
      reason: "Correct outcome",
      correctOutcome: true,
    };
  }

  const complicated = isComplicatedScore(actual.home, actual.away);
  return {
    points: complicated ? POINTS.COMPLICATED_EXACT : POINTS.EXACT_SCORE,
    reason: complicated ? "Exact complicated score" : "Exact score",
    exactScoreHit: true,
    complicatedExactScoreHit: complicated,
    correctOutcome: true,
    qualifyingWinnerHit: false,
  };
}

/**
 * Score an extra-time or penalty shoot-out prediction.
 *  - 0 if actual missing or outcome wrong
 *  - 1 for correct outcome only
 *  - 2 for exact score
 */
export function scoreExtraOrPenaltyPrediction(
  prediction: ScoreInput,
  actual: ScoreInput,
): ScoringResult {
  if (!bothPresent(actual)) return emptyResult("Actual score not entered yet");
  if (!bothPresent(prediction)) return emptyResult("No prediction submitted");

  const predOutcome = getOutcome(prediction.home, prediction.away);
  const actualOutcome = getOutcome(actual.home, actual.away);

  if (predOutcome !== actualOutcome) return emptyResult("Wrong outcome");

  const exact = prediction.home === actual.home && prediction.away === actual.away;
  if (exact) {
    return {
      ...emptyResult("Exact score"),
      points: POINTS.ET_PEN_EXACT,
      reason: "Exact score",
      exactScoreHit: true,
      correctOutcome: true,
    };
  }
  return {
    ...emptyResult("Correct outcome"),
    points: POINTS.ET_PEN_OUTCOME,
    reason: "Correct outcome",
    correctOutcome: true,
  };
}

export type Side = "HOME" | "AWAY";

export interface KnockoutScoreInput {
  normal: ScoreInput;
  extra?: ScoreInput | null;
  penalty?: ScoreInput | null;
  /** Explicit advancing team, if provided. Overrides derivation from goals. */
  winner?: Side | null;
}

/**
 * Resolve which side advances from a knockout tie, combining normal + extra time,
 * then penalties as a tiebreak. Returns null when the result is ambiguous
 * (aggregate tied with no penalty decider).
 */
export function resolveKnockoutWinner(input: KnockoutScoreInput): Side | null {
  if (input.winner === "HOME" || input.winner === "AWAY") return input.winner;

  const nh = isNum(input.normal.home) ? input.normal.home : 0;
  const na = isNum(input.normal.away) ? input.normal.away : 0;
  const eh = input.extra && isNum(input.extra.home) ? input.extra.home : 0;
  const ea = input.extra && isNum(input.extra.away) ? input.extra.away : 0;

  const aggHome = nh + eh;
  const aggAway = na + ea;
  if (aggHome > aggAway) return "HOME";
  if (aggAway > aggHome) return "AWAY";

  if (input.penalty && bothPresent(input.penalty)) {
    if (input.penalty.home > input.penalty.away) return "HOME";
    if (input.penalty.away > input.penalty.home) return "AWAY";
  }
  return null;
}

/**
 * True when the knockout prediction does not unambiguously identify an advancing
 * team after all applicable parts are filled in (used for validation).
 */
export function isKnockoutPredictionAmbiguous(input: KnockoutScoreInput): boolean {
  return resolveKnockoutWinner(input) === null;
}

export interface KnockoutScoringResult extends ScoringResult {
  breakdown: {
    normal: ScoringResult;
    extra: ScoringResult | null;
    penalty: ScoringResult | null;
    qualifyingWinnerPoints: number;
  };
}

/**
 * Score a full knockout match: normal time (group rules) + extra time + penalties
 * (ET/penalty rules) + 1 bonus point for predicting the advancing team.
 */
export function scoreKnockoutMatch(
  prediction: KnockoutScoreInput,
  actual: KnockoutScoreInput,
): KnockoutScoringResult {
  const normal = scoreNormalPrediction(prediction.normal, actual.normal);

  const emptyScore: ScoreInput = { home: null, away: null };
  const extra =
    actual.extra && bothPresent(actual.extra)
      ? scoreExtraOrPenaltyPrediction(prediction.extra ?? emptyScore, actual.extra)
      : null;

  const penalty =
    actual.penalty && bothPresent(actual.penalty)
      ? scoreExtraOrPenaltyPrediction(prediction.penalty ?? emptyScore, actual.penalty)
      : null;

  const actualWinner = resolveKnockoutWinner(actual);
  const predictedWinner = resolveKnockoutWinner(prediction);
  const qualifyingWinnerHit =
    actualWinner !== null && predictedWinner !== null && actualWinner === predictedWinner;
  const qualifyingWinnerPoints = qualifyingWinnerHit ? POINTS.QUALIFYING_WINNER : 0;

  const points =
    normal.points +
    (extra?.points ?? 0) +
    (penalty?.points ?? 0) +
    qualifyingWinnerPoints;

  return {
    points,
    reason: "Knockout match",
    exactScoreHit: normal.exactScoreHit,
    complicatedExactScoreHit: normal.complicatedExactScoreHit,
    correctOutcome: normal.correctOutcome,
    qualifyingWinnerHit,
    breakdown: { normal, extra, penalty, qualifyingWinnerPoints },
  };
}

/**
 * 2 points for each correctly-picked team that actually reached the knockout stage.
 * Matching is by team id / identifier.
 */
export function scoreTeamPicks(
  playerPicks: string[],
  actualQualifiedTeams: string[],
): number {
  const qualified = new Set(actualQualifiedTeams);
  const seen = new Set<string>();
  let hits = 0;
  for (const pick of playerPicks) {
    if (seen.has(pick)) continue;
    seen.add(pick);
    if (qualified.has(pick)) hits += 1;
  }
  return hits * POINTS.TEAM_PICK;
}

/** 8 points if the picked champion matches the actual champion, else 0. */
export function scoreChampionPick(
  playerChampion: string | null | undefined,
  actualChampion: string | null | undefined,
): number {
  if (!playerChampion || !actualChampion) return 0;
  return playerChampion === actualChampion ? POINTS.CHAMPION : 0;
}

export interface LeaderboardInput {
  userId: string;
  name: string;
  paid: boolean;
  groupStagePoints: number;
  knockoutTeamPoints: number;
  knockoutStagePoints: number;
  championPoints: number;
  exactScoreHits: number;
  complicatedExactScoreHits: number;
  correctOutcomes: number;
}

export interface LeaderboardEntry extends LeaderboardInput {
  rank: number;
  totalPoints: number;
  prizeAmount: number;
}

/**
 * Build the ranked leaderboard with tie-breakers and prize allocation.
 *
 * Tie-breakers (ToR): more exact scores -> more complicated scores ->
 * more correct outcomes -> alphabetical by name (deterministic fallback).
 *
 * Prize pool = entryFee * (# paid players). Prizes are paid out by finishing
 * rank according to prizeSplit (rank -> fraction).
 */
export function calculateLeaderboard(
  inputs: LeaderboardInput[],
  options: { entryFee: number; prizeSplit: Record<string, number>; paidCount?: number },
): LeaderboardEntry[] {
  const withTotals = inputs.map((i) => ({
    ...i,
    totalPoints:
      i.groupStagePoints +
      i.knockoutTeamPoints +
      i.knockoutStagePoints +
      i.championPoints,
  }));

  withTotals.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScoreHits !== a.exactScoreHits) return b.exactScoreHits - a.exactScoreHits;
    if (b.complicatedExactScoreHits !== a.complicatedExactScoreHits)
      return b.complicatedExactScoreHits - a.complicatedExactScoreHits;
    if (b.correctOutcomes !== a.correctOutcomes) return b.correctOutcomes - a.correctOutcomes;
    return a.name.localeCompare(b.name);
  });

  const paidCount =
    options.paidCount ?? withTotals.filter((p) => p.paid).length;
  const pool = options.entryFee * paidCount;

  return withTotals.map((entry, index) => {
    const rank = index + 1;
    const fraction = options.prizeSplit[String(rank)] ?? 0;
    return {
      ...entry,
      rank,
      prizeAmount: Math.round(pool * fraction),
    };
  });
}
