import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTournament } from "@/lib/standings";
import { ChampionStats } from "@/components/champion-stats";
import { Button } from "@/components/ui/button";
import { TEAM_PICK_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ChampionPage() {
  const user = await requireUser();
  const tournament = await getActiveTournament();

  const [picks, actualChampion] = await Promise.all([
    prisma.teamPick.findMany({
      where: { tournamentId: tournament.id, type: TEAM_PICK_TYPES.CHAMPION },
      include: { user: true, team: true },
      orderBy: { team: { name: "asc" } },
    }),
    prisma.actualTeamStatus.findFirst({
      where: { tournamentId: tournament.id, champion: true },
      include: { team: true },
    }),
  ]);

  const rows = picks.map((p) => ({
    userId: p.user.id,
    name: p.user.name,
    teamId: p.team.id,
    teamName: p.team.name,
    isMe: p.user.id === user.id,
  }));

  const myPickId = picks.find((p) => p.userId === user.id)?.teamId ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-white md:text-3xl">Չեմպիոնի ընտրությունները 🏆</h1>
          <p className="text-sm text-navy-300">Ու՞մ վրա են հույս դրել (ում են չեմպիոն տեսնում) մեր տղերքը:</p>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            ← Իմ էջը
          </Button>
        </Link>
      </div>

      <ChampionStats
        picks={rows}
        myPickId={myPickId}
        actualChampionId={actualChampion?.teamId ?? null}
      />
    </div>
  );
}
