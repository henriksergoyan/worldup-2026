import { describe, expect, it } from "vitest";
import { groupR3FirstKickoff, groupR3PhaseLockAt, isGroupRound3Match } from "./deadlines";
import { STAGES } from "./constants";

describe("GROUP_R3 deadline", () => {
  const matches = [
    { stage: STAGES.GROUP, round: null, matchNumber: 1, scheduledAt: new Date("2026-06-10T15:00:00Z") },
    { stage: STAGES.GROUP, round: null, matchNumber: 5, scheduledAt: new Date("2026-06-23T16:00:00Z") },
    { stage: STAGES.GROUP, round: null, matchNumber: 6, scheduledAt: new Date("2026-06-23T19:00:00Z") },
    { stage: STAGES.GROUP, round: null, matchNumber: 11, scheduledAt: new Date("2026-06-24T15:00:00Z") },
  ];

  it("identifies round 3 group matches", () => {
    expect(isGroupRound3Match(matches[0])).toBe(false);
    expect(isGroupRound3Match(matches[1])).toBe(true);
    expect(isGroupRound3Match(matches[2])).toBe(true);
  });

  it("locks 1 hour before the earliest round 3 kickoff", () => {
    const first = groupR3FirstKickoff(matches);
    expect(first?.toISOString()).toBe("2026-06-23T16:00:00.000Z");

    const lockAt = groupR3PhaseLockAt(matches, 60);
    expect(lockAt?.toISOString()).toBe("2026-06-23T15:00:00.000Z");
  });
});
