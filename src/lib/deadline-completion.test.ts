import { describe, expect, it } from "vitest";
import { isMatchPredictionComplete } from "./deadline-completion";
import { STAGES } from "./constants";

describe("isMatchPredictionComplete", () => {
  const groupMatch = { stage: STAGES.GROUP, homeTeamId: "h", awayTeamId: "a" };

  it("returns false when scores are missing", () => {
    expect(isMatchPredictionComplete(undefined, groupMatch)).toBe(false);
    expect(
      isMatchPredictionComplete(
        {
          userId: "u",
          matchId: "m",
          normalHomeGoals: 1,
          normalAwayGoals: null,
          extraHomeGoals: null,
          extraAwayGoals: null,
          penaltyHomeGoals: null,
          penaltyAwayGoals: null,
          predictedWinnerTeamId: null,
        },
        groupMatch,
      ),
    ).toBe(false);
  });

  it("returns true for group match with both scores", () => {
    expect(
      isMatchPredictionComplete(
        {
          userId: "u",
          matchId: "m",
          normalHomeGoals: 2,
          normalAwayGoals: 1,
          extraHomeGoals: null,
          extraAwayGoals: null,
          penaltyHomeGoals: null,
          penaltyAwayGoals: null,
          predictedWinnerTeamId: null,
        },
        groupMatch,
      ),
    ).toBe(true);
  });

  it("returns false for ambiguous knockout draw", () => {
    expect(
      isMatchPredictionComplete(
        {
          userId: "u",
          matchId: "m",
          normalHomeGoals: 1,
          normalAwayGoals: 1,
          extraHomeGoals: null,
          extraAwayGoals: null,
          penaltyHomeGoals: null,
          penaltyAwayGoals: null,
          predictedWinnerTeamId: null,
        },
        { stage: STAGES.KNOCKOUT, homeTeamId: "h", awayTeamId: "a" },
      ),
    ).toBe(false);
  });

  it("returns true for knockout with winner on draw", () => {
    expect(
      isMatchPredictionComplete(
        {
          userId: "u",
          matchId: "m",
          normalHomeGoals: 1,
          normalAwayGoals: 1,
          extraHomeGoals: null,
          extraAwayGoals: null,
          penaltyHomeGoals: null,
          penaltyAwayGoals: null,
          predictedWinnerTeamId: "h",
        },
        { stage: STAGES.KNOCKOUT, homeTeamId: "h", awayTeamId: "a" },
      ),
    ).toBe(true);
  });
});
