// Update group-stage kickoff times in an existing database (no full reseed).
import { PrismaClient } from "@prisma/client";
import { lookupKickoff } from "../src/lib/wc-fixtures";

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    where: { stage: "GROUP" },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { matchNumber: "asc" },
  });

  let updated = 0;
  let missing = 0;

  for (const m of matches) {
    const home = m.homeTeam?.name;
    const away = m.awayTeam?.name;
    if (!home || !away) continue;

    const kickoff = lookupKickoff(home, away);
    if (!kickoff) {
      console.warn(`No kickoff: #${m.matchNumber} ${home} vs ${away}`);
      missing += 1;
      continue;
    }

    if (m.scheduledAt.getTime() !== kickoff.getTime()) {
      await prisma.match.update({
        where: { id: m.id },
        data: { scheduledAt: kickoff },
      });
      updated += 1;
      console.log(`#${m.matchNumber} ${home} vs ${away} → ${kickoff.toISOString()}`);
    }
  }

  console.log(`Done: ${updated} updated, ${missing} missing kickoff, ${matches.length - updated - missing} unchanged.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
