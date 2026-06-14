import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTournament } from "@/lib/standings";
import { AdminNav } from "@/components/admin/admin-nav";
import { TeamEditorRow, type TeamRow } from "@/components/admin/team-editor";
import { ClearChampion } from "@/components/admin/clear-champion";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  await requireAdmin();
  const tournament = await getActiveTournament();

  const [teams, statuses] = await Promise.all([
    prisma.team.findMany({
      where: { tournamentId: tournament.id },
      orderBy: [{ groupCode: "asc" }, { name: "asc" }],
    }),
    prisma.actualTeamStatus.findMany({ where: { tournamentId: tournament.id } }),
  ]);
  const statusByTeam = new Map(statuses.map((s) => [s.teamId, s]));

  const rows: TeamRow[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    groupCode: t.groupCode,
    qualified: statusByTeam.get(t.id)?.qualifiedToKnockout ?? false,
    champion: statusByTeam.get(t.id)?.champion ?? false,
  }));

  const qualifiedCount = rows.filter((r) => r.qualified).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-white md:text-3xl">Teams</h1>
          <p className="text-sm text-navy-300">
            Edit names/groups, mark knockout qualifiers ({qualifiedCount}) and the champion.
          </p>
        </div>
        <ClearChampion />
      </div>
      <AdminNav />

      <div className="space-y-2">
        {rows.map((t) => (
          <TeamEditorRow key={t.id} team={t} />
        ))}
      </div>
    </div>
  );
}
