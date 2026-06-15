import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTournament } from "@/lib/standings";
import { AdminNav } from "@/components/admin/admin-nav";
import { CreateKoMatch } from "@/components/admin/create-ko-match";
import { DeleteMatchButton } from "@/components/admin/delete-match-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamChip } from "@/components/team-chip";
import { formatDateTime } from "@/lib/utils";
import { ROUND_LABELS, STAGES, type Round } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminFixturesPage() {
  await requireAdmin();
  const tournament = await getActiveTournament();

  const [teams, matches] = await Promise.all([
    prisma.team.findMany({ where: { tournamentId: tournament.id }, orderBy: { name: "asc" } }),
    prisma.match.findMany({
      where: { tournamentId: tournament.id },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { matchNumber: "asc" },
    }),
  ]);

  const knockout = matches.filter((m) => m.stage === STAGES.KNOCKOUT);
  const group = matches.filter((m) => m.stage === STAGES.GROUP);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white md:text-3xl">Խաղացուցակ</h1>
        <p className="text-sm text-navy-300">
          {group.length} խմբային խաղ · {knockout.length} փլեյ-օֆ խաղ։ Ավելացրեք փլեյ-օֆ խաղերը, երբ թիմերը հայտնի դառնան։
        </p>
      </div>
      <AdminNav />

      <CreateKoMatch teams={teams.map((t) => ({ id: t.id, name: t.name }))} />

      <Card>
        <CardHeader>
          <CardTitle>Փլեյ-օֆ խաղեր</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {knockout.length === 0 ? (
            <p className="py-4 text-center text-sm text-navy-300">Դեռ փլեյ-օֆ խաղեր չկան։</p>
          ) : (
            knockout.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl bg-white/[0.02] p-3">
                <Badge variant="info">{ROUND_LABELS[(m.round as Round) ?? "R32"]}</Badge>
                <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <TeamChip name={m.homeTeam?.name} seedLabel={m.homeSeedLabel} align="right" />
                  <span className="text-xs text-navy-500">vs</span>
                  <TeamChip name={m.awayTeam?.name} seedLabel={m.awaySeedLabel} />
                </div>
                <span className="hidden text-xs text-navy-400 sm:block">{formatDateTime(m.scheduledAt)}</span>
                <DeleteMatchButton matchId={m.id} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Խմբային խաղեր</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {group.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2 text-sm">
              <span className="w-8 text-xs text-navy-500">#{m.matchNumber}</span>
              <Badge variant="muted">{m.groupCode}</Badge>
              <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-1">
                <TeamChip name={m.homeTeam?.name} align="right" />
                <span className="text-xs text-navy-500">v</span>
                <TeamChip name={m.awayTeam?.name} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
