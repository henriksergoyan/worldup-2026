import { describe, it, expect } from "vitest";
import { lookupKnockoutKickoff, KNOCKOUT_FIXTURES } from "./knockout-bracket";

/** Official FIFA / fwctimes.com EDT kickoffs (month, day, hour, minute). */
const OFFICIAL_ET: Record<number, [number, number, number, number]> = {
  73: [6, 28, 15, 0],
  74: [6, 29, 16, 30],
  75: [6, 29, 21, 0],
  76: [6, 29, 13, 0],
  77: [6, 30, 17, 0],
  78: [6, 30, 13, 0],
  79: [6, 30, 21, 0],
  80: [7, 1, 12, 0],
  81: [7, 1, 20, 0],
  82: [7, 1, 16, 0],
  83: [7, 2, 19, 0],
  84: [7, 2, 15, 0],
  85: [7, 2, 23, 0],
  86: [7, 3, 18, 0],
  87: [7, 3, 21, 30],
  88: [7, 3, 14, 0],
  89: [7, 4, 17, 0],
  90: [7, 4, 13, 0],
  91: [7, 5, 16, 0],
  92: [7, 5, 20, 0],
  93: [7, 6, 15, 0],
  94: [7, 6, 20, 0],
  95: [7, 7, 12, 0],
  96: [7, 7, 16, 0],
  97: [7, 9, 16, 0],
  98: [7, 10, 15, 0],
  99: [7, 11, 17, 0],
  100: [7, 11, 21, 0],
  101: [7, 14, 15, 0],
  102: [7, 15, 15, 0],
  103: [7, 18, 17, 0],
  104: [7, 19, 15, 0],
};

function etToUtc(month: number, day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(2026, month - 1, day, hour + 4, minute, 0));
}

describe("knockout bracket kickoffs", () => {
  it("defines all 32 knockout fixtures", () => {
    expect(KNOCKOUT_FIXTURES).toHaveLength(32);
  });

  it("matches official FIFA EDT schedule for every knockout match", () => {
    for (const [matchNumber, [month, day, hour, minute]] of Object.entries(OFFICIAL_ET)) {
      const expected = etToUtc(month, day, hour, minute);
      const actual = lookupKnockoutKickoff(Number(matchNumber));
      expect(actual?.toISOString(), `match ${matchNumber}`).toBe(expected.toISOString());
    }
  });

  it("places Argentina path R16 (match 95) on July 7, not July 6", () => {
    const kickoff = lookupKnockoutKickoff(95)!;
    expect(kickoff.getUTCDate()).toBe(7);
    expect(kickoff.getUTCMonth()).toBe(6); // July
  });
});
