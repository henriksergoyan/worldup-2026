import { describe, it, expect } from "vitest";
import {
  getOutcome,
  isComplicatedScore,
  scoreNormalPrediction,
  scoreExtraOrPenaltyPrediction,
  scoreKnockoutMatch,
  scoreTeamPicks,
  scoreChampionPick,
  resolveKnockoutWinner,
  isKnockoutPredictionAmbiguous,
  sanitizeKnockoutExtras,
  canEnterKnockoutPenalties,
  visibleKnockoutExtras,
  calculateLeaderboard,
} from "./scoring";

describe("getOutcome", () => {
  it("detects home win, draw, away win", () => {
    expect(getOutcome(2, 1)).toBe("1");
    expect(getOutcome(1, 1)).toBe("X");
    expect(getOutcome(0, 2)).toBe("2");
  });
});

describe("isComplicatedScore", () => {
  it("is true when total goals >= 4", () => {
    expect(isComplicatedScore(2, 2)).toBe(true);
    expect(isComplicatedScore(3, 1)).toBe(true);
    expect(isComplicatedScore(4, 0)).toBe(true);
  });
  it("is true when |diff| >= 3", () => {
    expect(isComplicatedScore(3, 0)).toBe(true);
    expect(isComplicatedScore(0, 3)).toBe(true);
  });
  it("is false for small, close scores", () => {
    expect(isComplicatedScore(2, 1)).toBe(false);
    expect(isComplicatedScore(1, 1)).toBe(false);
    expect(isComplicatedScore(0, 0)).toBe(false);
    expect(isComplicatedScore(1, 0)).toBe(false);
  });
});

describe("scoreNormalPrediction", () => {
  it("returns 0 when actual score is missing", () => {
    const r = scoreNormalPrediction({ home: 2, away: 1 }, { home: null, away: null });
    expect(r.points).toBe(0);
  });

  it("examples from the spec", () => {
    // Actual 2-1, predicted 2-1 => 5
    expect(scoreNormalPrediction({ home: 2, away: 1 }, { home: 2, away: 1 }).points).toBe(5);
    // Actual 3-0, predicted 3-0 => 6 (complicated)
    expect(scoreNormalPrediction({ home: 3, away: 0 }, { home: 3, away: 0 }).points).toBe(6);
    // Actual 2-2, predicted 2-2 => 6 (complicated, total 4)
    expect(scoreNormalPrediction({ home: 2, away: 2 }, { home: 2, away: 2 }).points).toBe(6);
    // Actual 2-1, predicted 1-0 => 3 (correct outcome only)
    expect(scoreNormalPrediction({ home: 1, away: 0 }, { home: 2, away: 1 }).points).toBe(3);
    // Actual 0-0, predicted 1-1 => 3 (correct outcome, draw)
    expect(scoreNormalPrediction({ home: 1, away: 1 }, { home: 0, away: 0 }).points).toBe(3);
    // Actual 1-0, predicted 0-1 => 0 (wrong outcome)
    expect(scoreNormalPrediction({ home: 0, away: 1 }, { home: 1, away: 0 }).points).toBe(0);
  });

  it("sets flags correctly for a complicated exact hit", () => {
    const r = scoreNormalPrediction({ home: 4, away: 1 }, { home: 4, away: 1 });
    expect(r.exactScoreHit).toBe(true);
    expect(r.complicatedExactScoreHit).toBe(true);
    expect(r.correctOutcome).toBe(true);
  });

  it("exact non-complicated does not set complicated flag", () => {
    const r = scoreNormalPrediction({ home: 2, away: 1 }, { home: 2, away: 1 });
    expect(r.exactScoreHit).toBe(true);
    expect(r.complicatedExactScoreHit).toBe(false);
  });
});

describe("scoreExtraOrPenaltyPrediction", () => {
  it("0 missing, 1 outcome, 2 exact", () => {
    expect(scoreExtraOrPenaltyPrediction({ home: 1, away: 0 }, { home: null, away: null }).points).toBe(0);
    expect(scoreExtraOrPenaltyPrediction({ home: 2, away: 0 }, { home: 1, away: 0 }).points).toBe(1);
    expect(scoreExtraOrPenaltyPrediction({ home: 1, away: 0 }, { home: 1, away: 0 }).points).toBe(2);
    expect(scoreExtraOrPenaltyPrediction({ home: 0, away: 1 }, { home: 1, away: 0 }).points).toBe(0);
  });
});

describe("resolveKnockoutWinner", () => {
  it("uses normal + extra aggregate", () => {
    expect(resolveKnockoutWinner({ normal: { home: 2, away: 1 } })).toBe("HOME");
    expect(resolveKnockoutWinner({ normal: { home: 1, away: 1 }, extra: { home: 0, away: 1 } })).toBe("AWAY");
  });
  it("falls back to penalties when aggregate tied", () => {
    expect(
      resolveKnockoutWinner({ normal: { home: 1, away: 1 }, extra: { home: 0, away: 0 }, penalty: { home: 4, away: 3 } }),
    ).toBe("HOME");
  });
  it("is ambiguous when tied with no decider", () => {
    expect(resolveKnockoutWinner({ normal: { home: 1, away: 1 } })).toBeNull();
    expect(isKnockoutPredictionAmbiguous({ normal: { home: 0, away: 0 } })).toBe(true);
  });
  it("respects explicit winner", () => {
    expect(resolveKnockoutWinner({ normal: { home: 1, away: 1 }, winner: "AWAY" })).toBe("AWAY");
  });
  it("ignores extra time and penalties when normal time has a winner", () => {
    expect(
      resolveKnockoutWinner({
        normal: { home: 0, away: 1 },
        extra: { home: 1, away: 0 },
        penalty: { home: 4, away: 3 },
      }),
    ).toBe("AWAY");
  });
});

describe("sanitizeKnockoutExtras", () => {
  it("clears extra and penalties when normal time is not a draw", () => {
    expect(
      sanitizeKnockoutExtras({
        normal: { home: 2, away: 1 },
        extra: { home: 1, away: 0 },
        penalty: { home: 4, away: 3 },
      }),
    ).toEqual({
      extra: { home: null, away: null },
      penalty: { home: null, away: null },
    });
  });

  it("clears penalties when extra time breaks the tie", () => {
    expect(
      sanitizeKnockoutExtras({
        normal: { home: 1, away: 1 },
        extra: { home: 1, away: 0 },
        penalty: { home: 4, away: 3 },
      }),
    ).toEqual({
      extra: { home: 1, away: 0 },
      penalty: { home: null, away: null },
    });
  });

  it("keeps penalties when aggregate stays tied after extra time", () => {
    expect(
      sanitizeKnockoutExtras({
        normal: { home: 1, away: 1 },
        extra: { home: 0, away: 0 },
        penalty: { home: 4, away: 3 },
      }),
    ).toEqual({
      extra: { home: 0, away: 0 },
      penalty: { home: 4, away: 3 },
    });
  });
});

describe("canEnterKnockoutPenalties", () => {
  it("requires a draw and completed extra time with tied aggregate", () => {
    expect(
      canEnterKnockoutPenalties({
        normal: { home: 2, away: 1 },
        extra: { home: 0, away: 0 },
      }),
    ).toBe(false);
    expect(
      canEnterKnockoutPenalties({
        normal: { home: 1, away: 1 },
        extra: { home: null, away: null },
      }),
    ).toBe(false);
    expect(
      canEnterKnockoutPenalties({
        normal: { home: 1, away: 1 },
        extra: { home: 0, away: 0 },
      }),
    ).toBe(true);
  });
});

describe("scoreKnockoutMatch", () => {
  it("scores normal time with group rules and adds qualifying winner bonus", () => {
    const r = scoreKnockoutMatch(
      { normal: { home: 2, away: 0 } },
      { normal: { home: 2, away: 0 } },
    );
    // exact 2-0 (not complicated) = 5, advancing team correct = +1
    expect(r.points).toBe(6);
    expect(r.qualifyingWinnerHit).toBe(true);
  });

  it("adds extra-time and penalty points", () => {
    const pred = {
      normal: { home: 1, away: 1 },
      extra: { home: 0, away: 0 },
      penalty: { home: 4, away: 3 },
    };
    const actual = {
      normal: { home: 1, away: 1 },
      extra: { home: 0, away: 0 },
      penalty: { home: 4, away: 3 },
    };
    const r = scoreKnockoutMatch(pred, actual);
    // normal exact 1-1 = 5, extra exact 0-0 = 2, penalty exact 4-3 = 2, winner = 1
    expect(r.points).toBe(10);
    expect(r.breakdown.qualifyingWinnerPoints).toBe(1);
  });

  it("no winner bonus when advancing team predicted wrong", () => {
    const r = scoreKnockoutMatch(
      { normal: { home: 0, away: 2 } },
      { normal: { home: 2, away: 0 } },
    );
    expect(r.qualifyingWinnerHit).toBe(false);
    expect(r.points).toBe(0);
  });

  it("awards the advancing bonus even when the manner of winning differs", () => {
    // Predicted: home advances via extra time (normal draw, ET win).
    const pred = {
      normal: { home: 1, away: 1 },
      extra: { home: 1, away: 0 },
    };
    // Actual: home advanced in normal time (no extra time played).
    const actual = { normal: { home: 2, away: 0 } };
    const r = scoreKnockoutMatch(pred, actual);
    // Wrong normal score/outcome (0) but advancing team correct → +1.
    expect(r.qualifyingWinnerHit).toBe(true);
    expect(r.breakdown.qualifyingWinnerPoints).toBe(1);
    expect(r.points).toBe(1);
  });

  it("ignores extra time and penalties when the match did not go beyond 90 minutes", () => {
    const pred = {
      normal: { home: 0, away: 2 },
      extra: { home: 0, away: 0 },
      penalty: { home: 4, away: 3 },
    };
    const actual = {
      normal: { home: 0, away: 1 },
      extra: { home: 0, away: 0 },
      penalty: { home: 4, away: 3 },
    };
    const r = scoreKnockoutMatch(pred, actual);
    expect(r.points).toBe(4);
    expect(r.breakdown.extra).toBeNull();
    expect(r.breakdown.penalty).toBeNull();
  });

  it("gives the same normal-time points to everyone with the same full-time pick", () => {
    const actual = {
      normal: { home: 0, away: 1 },
      extra: { home: 0, away: 0 },
      penalty: { home: 5, away: 4 },
    };
    const withExtras = scoreKnockoutMatch(
      { normal: { home: 0, away: 2 }, extra: { home: 0, away: 0 }, penalty: { home: 5, away: 4 } },
      actual,
    );
    const normalOnly = scoreKnockoutMatch({ normal: { home: 0, away: 2 } }, actual);
    expect(withExtras.points).toBe(normalOnly.points);
    expect(normalOnly.points).toBe(4);
  });

  it("does not award extra-time or penalty points when the player did not predict a draw at 90 minutes", () => {
    const actual = {
      normal: { home: 1, away: 1 },
      extra: { home: 0, away: 0 },
      penalty: { home: 3, away: 4 },
    };
    const wrongWinnerWithStaleExtras = scoreKnockoutMatch(
      { normal: { home: 2, away: 0 }, extra: { home: 0, away: 0 }, penalty: { home: 3, away: 4 } },
      actual,
    );
    const wrongWinnerNormalOnly = scoreKnockoutMatch({ normal: { home: 2, away: 0 } }, actual);
    expect(wrongWinnerWithStaleExtras.points).toBe(0);
    expect(wrongWinnerNormalOnly.points).toBe(0);
    expect(wrongWinnerWithStaleExtras.breakdown.extra?.points ?? 0).toBe(0);
    expect(wrongWinnerWithStaleExtras.breakdown.penalty?.points ?? 0).toBe(0);
  });
});

describe("visibleKnockoutExtras", () => {
  it("shows extra time and penalties only when the score chain is valid", () => {
    expect(
      visibleKnockoutExtras({
        normalHome: 1,
        normalAway: 1,
        extraHome: 0,
        extraAway: 0,
        penaltyHome: 4,
        penaltyAway: 3,
      }),
    ).toEqual({
      extra: { home: 0, away: 0 },
      penalty: { home: 4, away: 3 },
    });
  });

  it("hides extra time when normal time is not a draw", () => {
    expect(
      visibleKnockoutExtras({
        normalHome: 2,
        normalAway: 0,
        extraHome: 1,
        extraAway: 0,
        penaltyHome: 5,
        penaltyAway: 4,
      }),
    ).toEqual({ extra: null, penalty: null });
  });
});

describe("scoreTeamPicks", () => {
  it("2 points per correct qualified team, ignores duplicates", () => {
    expect(scoreTeamPicks(["BRA", "ARG", "FRA"], ["BRA", "FRA", "ESP"])).toBe(4);
    expect(scoreTeamPicks(["BRA", "BRA"], ["BRA"])).toBe(2);
    expect(scoreTeamPicks([], ["BRA"])).toBe(0);
  });
});

describe("scoreChampionPick", () => {
  it("8 for correct, 0 otherwise", () => {
    expect(scoreChampionPick("BRA", "BRA")).toBe(8);
    expect(scoreChampionPick("BRA", "ARG")).toBe(0);
    expect(scoreChampionPick(null, "ARG")).toBe(0);
    expect(scoreChampionPick("BRA", null)).toBe(0);
  });
});

describe("calculateLeaderboard", () => {
  const base = {
    knockoutTeamPoints: 0,
    knockoutStagePoints: 0,
    championPoints: 0,
    exactScoreHits: 0,
    complicatedExactScoreHits: 0,
    correctOutcomes: 0,
    paid: true,
  };

  it("ranks by total points then tie-breakers", () => {
    const lb = calculateLeaderboard(
      [
        { ...base, userId: "a", name: "Alice", groupStagePoints: 10, exactScoreHits: 1 },
        { ...base, userId: "b", name: "Bob", groupStagePoints: 10, exactScoreHits: 3 },
        { ...base, userId: "c", name: "Carol", groupStagePoints: 20 },
      ],
      { entryFee: 10000, prizeSplit: { "1": 0.4, "2": 0.2, "3": 0.15 } },
    );
    expect(lb.map((e) => e.name)).toEqual(["Carol", "Bob", "Alice"]);
    expect(lb[0].rank).toBe(1);
  });

  it("breaks equal points by exact score hits for rank and prizes", () => {
    const lb = calculateLeaderboard(
      [
        { ...base, userId: "a", name: "Alice", groupStagePoints: 10, exactScoreHits: 1 },
        { ...base, userId: "b", name: "Bob", groupStagePoints: 10, exactScoreHits: 3 },
      ],
      { entryFee: 10000, prizeSplit: { "1": 0.4, "2": 0.2 } },
    );
    expect(lb.map((e) => e.name)).toEqual(["Bob", "Alice"]);
    expect(lb[0].rank).toBe(1);
    expect(lb[1].rank).toBe(2);
    expect(lb[0].prizeAmount).toBe(8000);
    expect(lb[1].prizeAmount).toBe(4000);
  });

  it("assigns the same rank when all tie-breakers match", () => {
    const lb = calculateLeaderboard(
      [
        { ...base, userId: "a", name: "Zoe", groupStagePoints: 5, exactScoreHits: 2 },
        { ...base, userId: "b", name: "Amy", groupStagePoints: 5, exactScoreHits: 2 },
      ],
      { entryFee: 10000, prizeSplit: { "1": 0.4, "2": 0.2 } },
    );
    expect(lb[0].rank).toBe(1);
    expect(lb[1].rank).toBe(1);
  });

  it("breaks exact-score ties by complicated, then outcomes, then name", () => {
    const lb = calculateLeaderboard(
      [
        { ...base, userId: "a", name: "Zoe", groupStagePoints: 5, exactScoreHits: 2, complicatedExactScoreHits: 1, correctOutcomes: 5 },
        { ...base, userId: "b", name: "Amy", groupStagePoints: 5, exactScoreHits: 2, complicatedExactScoreHits: 1, correctOutcomes: 5 },
      ],
      { entryFee: 10000, prizeSplit: {} },
    );
    expect(lb.map((e) => e.name)).toEqual(["Amy", "Zoe"]);
  });

  it("computes prize pool from paid players", () => {
    const lb = calculateLeaderboard(
      [
        { ...base, userId: "a", name: "Alice", groupStagePoints: 30, paid: true },
        { ...base, userId: "b", name: "Bob", groupStagePoints: 20, paid: true },
        { ...base, userId: "c", name: "Carol", groupStagePoints: 10, paid: false },
      ],
      { entryFee: 10000, prizeSplit: { "1": 0.4, "2": 0.2 } },
    );
    // pool = 2 paid * 10000 = 20000
    expect(lb[0].prizeAmount).toBe(8000); // 40%
    expect(lb[1].prizeAmount).toBe(4000); // 20%
    expect(lb[2].prizeAmount).toBe(0);
  });
});
