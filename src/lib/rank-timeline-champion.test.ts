import { describe, it, expect } from "vitest";
import { scoreChampionPick, calculateLeaderboard } from "./scoring";
import { POINTS } from "./constants";

/**
 * Lightweight check that champion bonus only changes totals when applied,
 * matching rank-timeline's "award after Final" behavior.
 */
describe("champion timing for rank totals", () => {
  it("awards POINTS.CHAMPION only when champion is known", () => {
    expect(scoreChampionPick("spain", null)).toBe(0);
    expect(scoreChampionPick("spain", "spain")).toBe(POINTS.CHAMPION);
    expect(scoreChampionPick("france", "spain")).toBe(0);
  });

  it("changes leaderboard order when champion points are added at the end", () => {
    const base = [
      {
        userId: "a",
        name: "Abel",
        paid: true,
        groupStagePoints: 120,
        knockoutTeamPoints: 10,
        knockoutStagePoints: 40,
        championPoints: 0,
        exactScoreHits: 8,
        complicatedExactScoreHits: 2,
        correctOutcomes: 30,
      },
      {
        userId: "m",
        name: "Minas",
        paid: true,
        groupStagePoints: 118,
        knockoutTeamPoints: 10,
        knockoutStagePoints: 40,
        championPoints: 0,
        exactScoreHits: 7,
        complicatedExactScoreHits: 1,
        correctOutcomes: 28,
      },
    ];

    const before = calculateLeaderboard(base, {
      entryFee: 10000,
      prizeSplit: { "1": 0.4, "2": 0.2 },
      paidCount: 2,
    });
    expect(before[0]!.userId).toBe("a");

    const afterFinal = calculateLeaderboard(
      [
        { ...base[0]!, championPoints: 0 },
        { ...base[1]!, championPoints: POINTS.CHAMPION },
      ],
      { entryFee: 10000, prizeSplit: { "1": 0.4, "2": 0.2 }, paidCount: 2 },
    );
    expect(afterFinal[0]!.userId).toBe("m");
    expect(afterFinal.find((e) => e.userId === "m")!.totalPoints).toBe(
      before.find((e) => e.userId === "m")!.totalPoints + POINTS.CHAMPION,
    );
  });
});
