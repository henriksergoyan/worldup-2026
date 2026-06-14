import { prisma } from "./prisma";
import { TEAM_PICK_TYPES } from "./constants";
import { matchPlayerName } from "./user-utils";
import { parseMainWorkbook, defaultWorkbookPath } from "../../prisma/import";
import fs from "node:fs";

export async function syncTeamPicksFromWorkbook(tournamentId: string): Promise<{
  champions: number;
  qualifiers: number;
}> {
  const path = defaultWorkbookPath();
  if (!fs.existsSync(path)) return { champions: 0, qualifiers: 0 };

  const data = parseMainWorkbook(path);
  const [users, teams] = await Promise.all([
    prisma.user.findMany({ where: { role: "PLAYER" } }),
    prisma.team.findMany({ where: { tournamentId } }),
  ]);
  const teamByName = new Map(teams.map((t) => [t.name, t]));

  let champions = 0;
  let qualifiers = 0;

  for (const pick of data.championPicks) {
    const user = matchPlayerName(pick.player, users);
    const team = teamByName.get(pick.teamName);
    if (!user || !team) continue;

    await prisma.teamPick.deleteMany({
      where: { userId: user.id, tournamentId, type: TEAM_PICK_TYPES.CHAMPION },
    });
    await prisma.teamPick.create({
      data: { userId: user.id, tournamentId, teamId: team.id, type: TEAM_PICK_TYPES.CHAMPION },
    });
    champions++;
  }

  for (const pick of data.qualifierPicks) {
    const user = matchPlayerName(pick.player, users);
    const team = teamByName.get(pick.teamName);
    if (!user || !team) continue;

    const exists = await prisma.teamPick.findFirst({
      where: {
        userId: user.id,
        tournamentId,
        teamId: team.id,
        type: TEAM_PICK_TYPES.KNOCKOUT_QUALIFIER,
      },
    });
    if (!exists) {
      await prisma.teamPick.create({
        data: {
          userId: user.id,
          tournamentId,
          teamId: team.id,
          type: TEAM_PICK_TYPES.KNOCKOUT_QUALIFIER,
        },
      });
      qualifiers++;
    }
  }

  return { champions, qualifiers };
}
