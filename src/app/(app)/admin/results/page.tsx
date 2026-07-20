import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTournament } from "@/lib/standings";
import { AdminNav } from "@/components/admin/admin-nav";
import { ResultsEditor, type ResultDTO } from "@/components/admin/results-editor";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  await requireAdmin();
  const tournament = await getActiveTournament();

  const matches = await prisma.match.findMany({
    where: { tournamentId: tournament.id },
    include: { homeTeam: true, awayTeam: true, actualResult: true },
    orderBy: { matchNumber: "asc" },
  });

  const dtos: ResultDTO[] = matches.map((m) => ({
    id: m.id,
    matchNumber: m.matchNumber,
    stage: m.stage,
    round: m.round,
    groupCode: m.groupCode,
    scheduledAt: m.scheduledAt.toISOString(),
    homeName: m.homeTeam?.name ?? null,
    awayName: m.awayTeam?.name ?? null,
    homeSeedLabel: m.homeSeedLabel,
    awaySeedLabel: m.awaySeedLabel,
    result: m.actualResult
      ? {
          normalHome: m.actualResult.normalHomeGoals,
          normalAway: m.actualResult.normalAwayGoals,
          extraHome: m.actualResult.extraHomeGoals,
          extraAway: m.actualResult.extraAwayGoals,
          penaltyHome: m.actualResult.penaltyHomeGoals,
          penaltyAway: m.actualResult.penaltyAwayGoals,
          winner:
            m.actualResult.winnerTeamId === m.homeTeamId && m.homeTeamId
              ? ("HOME" as const)
              : m.actualResult.winnerTeamId === m.awayTeamId && m.awayTeamId
                ? ("AWAY" as const)
                : null,
          finalized: m.actualResult.finalized,
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white md:text-3xl">Արդյունքների մուտք</h1>
        <p className="text-sm text-navy-300">
          Մուտքագրեք կամ ուղղեք արդյունական հաշիվները։ Ավարտված խաղերն էլ կարելի է խմբագրել — պահպանելիս միավորները վերահաշվարկվում են։
        </p>
      </div>
      <AdminNav />
      <ResultsEditor matches={dtos} />
    </div>
  );
}
