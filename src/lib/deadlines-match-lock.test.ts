import { describe, expect, it, vi, afterEach } from "vitest";
import {
  canRevealPredictions,
  isMatchLocked,
  isMatchPredictionLocked,
} from "./deadlines";
import { PHASES, STAGES } from "./constants";

const r32Match = {
  stage: STAGES.KNOCKOUT,
  round: "R32",
  matchNumber: 73,
  scheduledAt: new Date("2026-07-05T20:00:00Z"),
};

const deadlines = new Map([
  [
    PHASES.KO_R32,
    {
      phase: PHASES.KO_R32,
      lockAt: new Date("2026-06-28T20:00:00Z"),
      isOpen: true,
      locked: true,
    },
  ],
]);

describe("isMatchLocked", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not lock upcoming matches when the phase deadline has passed", () => {
    vi.setSystemTime(new Date("2026-06-29T12:00:00Z"));
    expect(isMatchLocked(r32Match, deadlines, 0)).toBe(false);
  });

  it("locks a match once kickoff arrives", () => {
    vi.setSystemTime(new Date("2026-07-05T20:00:00Z"));
    expect(isMatchLocked(r32Match, deadlines, 0)).toBe(true);
    expect(isMatchPredictionLocked(r32Match, 0)).toBe(true);
  });

  it("respects a configured pre-kickoff lock window", () => {
    vi.setSystemTime(new Date("2026-07-05T19:30:00Z"));
    expect(isMatchLocked(r32Match, deadlines, 60)).toBe(true);
  });
});

describe("canRevealPredictions", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reveals others once the phase deadline passes, even before kickoff", () => {
    vi.setSystemTime(new Date("2026-06-29T12:00:00Z"));
    expect(
      canRevealPredictions(r32Match, {
        isAdmin: false,
        kickoffLockMinutes: 0,
        deadlines,
      }),
    ).toBe(true);
  });

  it("hides others before the phase deadline and before kickoff", () => {
    vi.setSystemTime(new Date("2026-06-20T12:00:00Z"));
    const openDeadlines = new Map([
      [
        PHASES.KO_R32,
        {
          phase: PHASES.KO_R32,
          lockAt: new Date("2026-06-28T20:00:00Z"),
          isOpen: true,
          locked: false,
        },
      ],
    ]);
    expect(
      canRevealPredictions(r32Match, {
        isAdmin: false,
        kickoffLockMinutes: 0,
        deadlines: openDeadlines,
      }),
    ).toBe(false);
  });

  it("reveals others at kickoff even when the phase deadline is still open", () => {
    vi.setSystemTime(new Date("2026-07-05T20:00:00Z"));
    const openDeadlines = new Map([
      [
        PHASES.KO_R16,
        {
          phase: PHASES.KO_R16,
          lockAt: new Date("2026-07-10T20:00:00Z"),
          isOpen: true,
          locked: false,
        },
      ],
    ]);
    const r16Match = { ...r32Match, round: "R16", matchNumber: 89 };
    expect(
      canRevealPredictions(r16Match, {
        isAdmin: false,
        kickoffLockMinutes: 0,
        deadlines: openDeadlines,
      }),
    ).toBe(true);
  });
});
