import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// JSON backup of all tournament data (admin only).
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [tournaments, teams, users, matches, predictions, teamPicks, teamStatuses, deadlines] =
    await Promise.all([
      prisma.tournament.findMany(),
      prisma.team.findMany(),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, paid: true, active: true },
      }),
      prisma.match.findMany({ include: { actualResult: true } }),
      prisma.prediction.findMany(),
      prisma.teamPick.findMany(),
      prisma.actualTeamStatus.findMany(),
      prisma.deadline.findMany(),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    tournaments,
    teams,
    users,
    matches,
    predictions,
    teamPicks,
    teamStatuses,
    deadlines,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="worldcup2026-backup-${Date.now()}.json"`,
    },
  });
}
