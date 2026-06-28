// Update group-stage and knockout kickoff times in an existing database (no full reseed).
import { PrismaClient } from "@prisma/client";
import { lookupKickoff } from "../src/lib/wc-fixtures";
import { lookupKnockoutKickoff } from "../src/lib/knockout-bracket";

const prisma = new PrismaClient();

async function main() {
  const groupMatches = await prisma.match.findMany({
    where: { stage: "GROUP" },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { matchNumber: "asc" },
  });

  let groupUpdated = 0;
  let groupMissing = 0;

  for (const m of groupMatches) {
    const home = m.homeTeam?.name;
    const away = m.awayTeam?.name;
    if (!home || !away) continue;

    const kickoff = lookupKickoff(home, away);
    if (!kickoff) {
      console.warn(`No group kickoff: #${m.matchNumber} ${home} vs ${away}`);
      groupMissing += 1;
      continue;
    }

    if (m.scheduledAt.getTime() !== kickoff.getTime()) {
      await prisma.match.update({
        where: { id: m.id },
        data: { scheduledAt: kickoff },
      });
      groupUpdated += 1;
      console.log(`#${m.matchNumber} ${home} vs ${away} → ${kickoff.toISOString()}`);
    }
  }

  const knockoutMatches = await prisma.match.findMany({
    where: { stage: "KNOCKOUT" },
    orderBy: { matchNumber: "asc" },
  });

  let koUpdated = 0;
  let koMissing = 0;

  for (const m of knockoutMatches) {
    const kickoff = lookupKnockoutKickoff(m.matchNumber);
    if (!kickoff) {
      console.warn(`No knockout kickoff: #${m.matchNumber}`);
      koMissing += 1;
      continue;
    }

    if (m.scheduledAt.getTime() !== kickoff.getTime()) {
      await prisma.match.update({
        where: { id: m.id },
        data: { scheduledAt: kickoff },
      });
      koUpdated += 1;
      console.log(`#${m.matchNumber} knockout → ${kickoff.toISOString()}`);
    }
  }

  console.log(
    `Done: group ${groupUpdated} updated (${groupMissing} missing), ` +
      `knockout ${koUpdated} updated (${koMissing} missing).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
