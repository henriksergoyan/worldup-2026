import { describe, expect, it } from "vitest";
import {
  isMatchLive,
  isMatchUpcoming,
  isMatchVisibleInUpcomingList,
  pickUpcomingMatches,
  UPCOMING_MATCH_VISIBLE_AFTER_KICKOFF_MS,
} from "./upcoming-matches";
import { STAGES } from "./constants";

const base = {
  stage: STAGES.GROUP,
  round: null,
  matchNumber: 1,
};

describe("upcoming match visibility", () => {
  const kickoff = new Date("2026-06-15T18:00:00Z");

  it("shows future matches as upcoming", () => {
    const now = kickoff.getTime() - 60_000;
    expect(isMatchUpcoming({ ...base, scheduledAt: kickoff }, now)).toBe(true);
    expect(isMatchVisibleInUpcomingList({ ...base, scheduledAt: kickoff }, now)).toBe(true);
  });

  it("shows live matches within 2 hours of kickoff", () => {
    const now = kickoff.getTime() + 30 * 60_000;
    expect(isMatchUpcoming({ ...base, scheduledAt: kickoff }, now)).toBe(false);
    expect(isMatchLive({ ...base, scheduledAt: kickoff }, now)).toBe(true);
    expect(isMatchVisibleInUpcomingList({ ...base, scheduledAt: kickoff }, now)).toBe(true);
  });

  it("hides matches more than 2 hours after kickoff", () => {
    const now = kickoff.getTime() + UPCOMING_MATCH_VISIBLE_AFTER_KICKOFF_MS + 1;
    expect(isMatchVisibleInUpcomingList({ ...base, scheduledAt: kickoff }, now)).toBe(false);
    expect(isMatchLive({ ...base, scheduledAt: kickoff }, now)).toBe(false);
  });

  it("hides finalized matches immediately", () => {
    const now = kickoff.getTime() + 30 * 60_000;
    expect(
      isMatchVisibleInUpcomingList(
        { ...base, scheduledAt: kickoff, actualResult: { finalized: true } },
        now,
      ),
    ).toBe(false);
  });
});

describe("pickUpcomingMatches", () => {
  it("prioritizes live matches over future open matches", () => {
    const now = Date.parse("2026-06-15T19:00:00Z");
    const live = {
      ...base,
      matchNumber: 1,
      scheduledAt: new Date("2026-06-15T18:30:00Z"),
    };
    const future = {
      ...base,
      matchNumber: 2,
      scheduledAt: new Date("2026-06-16T18:00:00Z"),
    };
    const picked = pickUpcomingMatches([future, live], new Map(), 60, 2, now);
    expect(picked[0]?.matchNumber).toBe(1);
  });
});
