import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  matchFindFirst: vi.fn(),
  resultUpdate: vi.fn(),
  statusFindFirst: vi.fn(),
  statusUpdateMany: vi.fn(),
  statusUpsert: vi.fn(),
}));

vi.mock("./prisma", () => ({
  prisma: {
    match: { findFirst: mocks.matchFindFirst },
    actualResult: { update: mocks.resultUpdate },
    actualTeamStatus: {
      findFirst: mocks.statusFindFirst,
      updateMany: mocks.statusUpdateMany,
      upsert: mocks.statusUpsert,
    },
  },
}));

import { syncChampionFromFinal } from "./bracket-engine";

describe("syncChampionFromFinal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when the final is not finalized", async () => {
    mocks.matchFindFirst.mockResolvedValue({
      id: "m104",
      matchNumber: 104,
      round: "FINAL",
      homeTeamId: "spain",
      awayTeamId: "argentina",
      actualResult: { finalized: false, winnerTeamId: "spain" },
    });
    await expect(syncChampionFromFinal("t1")).resolves.toBe(false);
    expect(mocks.statusUpsert).not.toHaveBeenCalled();
  });

  it("sets the final winner as champion", async () => {
    mocks.matchFindFirst.mockResolvedValue({
      id: "m104",
      matchNumber: 104,
      round: "FINAL",
      homeTeamId: "spain",
      awayTeamId: "argentina",
      actualResult: { finalized: true, winnerTeamId: "spain" },
    });
    mocks.statusFindFirst.mockResolvedValue(null);
    mocks.statusUpdateMany.mockResolvedValue({ count: 0 });
    mocks.statusUpsert.mockResolvedValue({});

    await expect(syncChampionFromFinal("t1")).resolves.toBe(true);
    expect(mocks.statusUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentId_teamId: { tournamentId: "t1", teamId: "spain" } },
        create: expect.objectContaining({ champion: true, teamId: "spain" }),
        update: { champion: true },
      }),
    );
  });

  it("derives champion from ET when winnerTeamId is missing", async () => {
    mocks.matchFindFirst.mockResolvedValue({
      id: "m104",
      matchNumber: 104,
      round: "FINAL",
      homeTeamId: "spain",
      awayTeamId: "argentina",
      actualResult: {
        finalized: true,
        winnerTeamId: null,
        normalHomeGoals: 0,
        normalAwayGoals: 0,
        extraHomeGoals: 1,
        extraAwayGoals: 0,
        penaltyHomeGoals: null,
        penaltyAwayGoals: null,
      },
    });
    mocks.resultUpdate.mockResolvedValue({});
    mocks.statusFindFirst.mockResolvedValue(null);
    mocks.statusUpdateMany.mockResolvedValue({ count: 0 });
    mocks.statusUpsert.mockResolvedValue({});

    await expect(syncChampionFromFinal("t1")).resolves.toBe(true);
    expect(mocks.resultUpdate).toHaveBeenCalledWith({
      where: { matchId: "m104" },
      data: { winnerTeamId: "spain" },
    });
    expect(mocks.statusUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ teamId: "spain", champion: true }),
      }),
    );
  });

  it("skips when the champion is already the final winner", async () => {
    mocks.matchFindFirst.mockResolvedValue({
      id: "m104",
      matchNumber: 104,
      round: "FINAL",
      homeTeamId: "spain",
      awayTeamId: "argentina",
      actualResult: { finalized: true, winnerTeamId: "spain" },
    });
    mocks.statusFindFirst.mockResolvedValue({ teamId: "spain" });

    await expect(syncChampionFromFinal("t1")).resolves.toBe(false);
    expect(mocks.statusUpsert).not.toHaveBeenCalled();
  });
});
