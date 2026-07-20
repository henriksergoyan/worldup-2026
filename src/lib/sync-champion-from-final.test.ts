import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  matchFindFirst: vi.fn(),
  statusFindFirst: vi.fn(),
  statusUpdateMany: vi.fn(),
  statusUpsert: vi.fn(),
}));

vi.mock("./prisma", () => ({
  prisma: {
    match: { findFirst: mocks.matchFindFirst },
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
      matchNumber: 104,
      round: "FINAL",
      actualResult: { finalized: false, winnerTeamId: "team-a" },
    });
    await expect(syncChampionFromFinal("t1")).resolves.toBe(false);
    expect(mocks.statusUpsert).not.toHaveBeenCalled();
  });

  it("sets the final winner as champion", async () => {
    mocks.matchFindFirst.mockResolvedValue({
      matchNumber: 104,
      round: "FINAL",
      actualResult: { finalized: true, winnerTeamId: "team-a" },
    });
    mocks.statusFindFirst.mockResolvedValue(null);
    mocks.statusUpdateMany.mockResolvedValue({ count: 0 });
    mocks.statusUpsert.mockResolvedValue({});

    await expect(syncChampionFromFinal("t1")).resolves.toBe(true);
    expect(mocks.statusUpdateMany).toHaveBeenCalledWith({
      where: { tournamentId: "t1", champion: true },
      data: { champion: false },
    });
    expect(mocks.statusUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentId_teamId: { tournamentId: "t1", teamId: "team-a" } },
        create: expect.objectContaining({ champion: true, teamId: "team-a" }),
        update: { champion: true },
      }),
    );
  });

  it("skips when the champion is already the final winner", async () => {
    mocks.matchFindFirst.mockResolvedValue({
      matchNumber: 104,
      round: "FINAL",
      actualResult: { finalized: true, winnerTeamId: "team-a" },
    });
    mocks.statusFindFirst.mockResolvedValue({ teamId: "team-a" });

    await expect(syncChampionFromFinal("t1")).resolves.toBe(false);
    expect(mocks.statusUpsert).not.toHaveBeenCalled();
  });
});
