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
  if (!bothPresent(input.normal)) return null;

  const nh = input.normal.home;
  const na = input.normal.away;
  if (nh > na) return "HOME";
  if (na > nh) return "AWAY";

  // Draw after 90 minutes — extra time may apply, then penalties.
  if (input.extra && bothPresent(input.extra)) {
    const aggHome = nh + input.extra.home;
    const aggAway = na + input.extra.away;
    if (aggHome > aggAway) return "HOME";
    if (aggAway > aggHome) return "AWAY";
  }

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

/** Extra time is only meaningful when normal time ends in a draw. */
export function isKnockoutNormalDraw(normal: ScoreInput): boolean {
  return bothPresent(normal) && normal.home === normal.away;
}

export interface KnockoutDisplayScore {
  normalHome: number | null;
  normalAway: number | null;
  extraHome?: number | null;
  extraAway?: number | null;
  penaltyHome?: number | null;
  penaltyAway?: number | null;
}

/** ET / penalty lines that should be shown when presenting a knockout score. */
export function visibleKnockoutExtras(score: KnockoutDisplayScore): {
  extra: { home: number; away: number } | null;
  penalty: { home: number; away: number } | null;
} {
  if (score.normalHome === null || score.normalAway === null) {
    return { extra: null, penalty: null };
  }
  const sanitized = sanitizeKnockoutExtras({
    normal: { home: score.normalHome, away: score.normalAway },
    extra: { home: score.extraHome ?? null, away: score.extraAway ?? null },
    penalty: { home: score.penaltyHome ?? null, away: score.penaltyAway ?? null },
  });
  const extra =
    sanitized.extra.home !== null && sanitized.extra.away !== null
      ? { home: sanitized.extra.home, away: sanitized.extra.away }
      : null;
  const penalty =
    sanitized.penalty.home !== null && sanitized.penalty.away !== null
      ? { home: sanitized.penalty.home, away: sanitized.penalty.away }
      : null;
  return { extra, penalty };
}

/** Penalties apply only when normal + extra time aggregate is still tied. */
export function canEnterKnockoutPenalties(input: {
  normal: ScoreInput;
  extra: ScoreInput;
}): boolean {
  if (!bothPresent(input.normal) || input.normal.home !== input.normal.away) return false;
  if (!bothPresent(input.extra)) return false;
  return input.normal.home + input.extra.home === input.normal.away + input.extra.away;
}

/** Remove extra-time / penalty fields that are invalid for the given normal-time score. */
export function sanitizeKnockoutExtras(input: {
  normal: { home: number; away: number };
  extra: { home: number | null; away: number | null };
  penalty: { home: number | null; away: number | null };
}): {
  extra: { home: number | null; away: number | null };
  penalty: { home: number | null; away: number | null };
} {
  if (input.normal.home !== input.normal.away) {
    return { extra: { home: null, away: null }, penalty: { home: null, away: null } };
  }
  const eh = input.extra.home;
  const ea = input.extra.away;
  if (eh === null || ea === null) {
    return { extra: { home: eh, away: ea }, penalty: { home: null, away: null } };
  }
  if (input.normal.home + eh !== input.normal.away + ea) {
    return { extra: { home: eh, away: ea }, penalty: { home: null, away: null } };
  }
  return { extra: { home: eh, away: ea }, penalty: { home: input.penalty.home, away: input.penalty.away } };
}

export interface KnockoutFieldValues {
  normalHome: number | null;
  normalAway: number | null;
  extraHome: number | null;
  extraAway: number | null;
  penaltyHome: number | null;
  penaltyAway: number | null;
}

/** Apply a partial knockout edit and clear invalid extra-time / penalty fields. */
export function patchKnockoutFields<T extends KnockoutFieldValues>(
  current: T,
  patch: Partial<T>,
): Partial<T> {
  let updates: Partial<T> = { ...patch };
  const nh = (updates.normalHome ?? current.normalHome) as number | null;
  const na = (updates.normalAway ?? current.normalAway) as number | null;

  if ("normalHome" in patch || "normalAway" in patch) {
    if (nh !== null && na !== null) {
      const sanitized = sanitizeKnockoutExtras({
        normal: { home: nh, away: na },
        extra: {
          home: (updates.extraHome ?? current.extraHome) as number | null,
          away: (updates.extraAway ?? current.extraAway) as number | null,
        },
        penalty: {
          home: (updates.penaltyHome ?? current.penaltyHome) as number | null,
          away: (updates.penaltyAway ?? current.penaltyAway) as number | null,
        },
      });
      updates = {
        ...updates,
        extraHome: sanitized.extra.home,
        extraAway: sanitized.extra.away,
        penaltyHome: sanitized.penalty.home,
        penaltyAway: sanitized.penalty.away,
      } as Partial<T>;
    }
  }

  const merged = { ...current, ...updates };
  if ("extraHome" in patch || "extraAway" in patch) {
    if (merged.normalHome !== null && merged.normalAway !== null) {
      const sanitized = sanitizeKnockoutExtras({
        normal: { home: merged.normalHome, away: merged.normalAway },
        extra: { home: merged.extraHome, away: merged.extraAway },
        penalty: { home: merged.penaltyHome, away: merged.penaltyAway },
      });
      updates = {
        ...updates,
        penaltyHome: sanitized.penalty.home,
        penaltyAway: sanitized.penalty.away,
      } as Partial<T>;
    }
  }

  return updates;
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
 * (only when the actual match went there) + 1 bonus point for predicting the advancing team.
 */
export function scoreKnockoutMatch(
  prediction: KnockoutScoreInput,
  actual: KnockoutScoreInput,
): KnockoutScoringResult {
  const normal = scoreNormalPrediction(prediction.normal, actual.normal);

  const emptyScore: ScoreInput = { home: null, away: null };
  let extra: ScoringResult | null = null;
  let penalty: ScoringResult | null = null;

  if (bothPresent(actual.normal)) {
    const actualSanitized = sanitizeKnockoutExtras({
      normal: actual.normal,
      extra: { home: actual.extra?.home ?? null, away: actual.extra?.away ?? null },
      penalty: { home: actual.penalty?.home ?? null, away: actual.penalty?.away ?? null },
    });
    const predGated = bothPresent(prediction.normal)
      ? sanitizeKnockoutExtras({
          normal: prediction.normal,
          extra: { home: prediction.extra?.home ?? null, away: prediction.extra?.away ?? null },
          penalty: { home: prediction.penalty?.home ?? null, away: prediction.penalty?.away ?? null },
        })
      : { extra: { home: null, away: null }, penalty: { home: null, away: null } };

    if (actualSanitized.extra.home !== null && actualSanitized.extra.away !== null) {
      extra = scoreExtraOrPenaltyPrediction(
        predGated.extra.home !== null && predGated.extra.away !== null ? predGated.extra : emptyScore,
        actualSanitized.extra,
      );
    }

    if (actualSanitized.penalty.home !== null && actualSanitized.penalty.away !== null) {
      penalty = scoreExtraOrPenaltyPrediction(
        predGated.penalty.home !== null && predGated.penalty.away !== null ? predGated.penalty : emptyScore,
        actualSanitized.penalty,
      );
    }
  }

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

  let rank = 1;
  return withTotals.map((entry, index) => {
    if (index > 0) {
      const prev = withTotals[index - 1];
      const sameStanding =
        prev.totalPoints === entry.totalPoints &&
        prev.exactScoreHits === entry.exactScoreHits &&
        prev.complicatedExactScoreHits === entry.complicatedExactScoreHits &&
        prev.correctOutcomes === entry.correctOutcomes;
      if (!sameStanding) rank = index + 1;
    }
    const fraction = options.prizeSplit[String(rank)] ?? 0;
    return {
      ...entry,
      rank,
      prizeAmount: Math.round(pool * fraction),
    };
  });
}
