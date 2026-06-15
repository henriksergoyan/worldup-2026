import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTournament } from "@/lib/standings";
import { AdminNav } from "@/components/admin/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamChip } from "@/components/team-chip";
import { formatDateTime } from "@/lib/utils";
import { ROUND_LABELS, STAGES, type Round } from "@/lib/constants";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminFixturesPage() {
  await requireAdmin();
  const tournament = await getActiveTournament();

  const matches = await prisma.match.findMany({
    where: { tournamentId: tournament.id },
    include: {
      homeTeam: true,
      awayTeam: true,
      _count: { select: { predictions: true } },
    },
    orderBy: [{ scheduledAt: "asc" }, { matchNumber: "asc" }],
  });

  const groupCount = matches.filter((m) => m.stage === STAGES.GROUP).length;
  const knockoutCount = matches.filter((m) => m.stage === STAGES.KNOCKOUT).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white md:text-3xl">Խաղացուցակ</h1>
        <p className="text-sm text-navy-300">
          {groupCount} խմբային · {knockoutCount} փլեյ-օֆ խաղ՝ դասավորված ըստ խաղի ժամանակագրության։ Սեղմեք ցանկացած խաղի վրա՝
          բոլոր մասնակիցների կանխատեսումները ցանկացած պահի տեսնելու համար։
        </p>
      </div>
      <AdminNav />

      <Card className="border-emerald-500/20 bg-emerald-500/[0.02] p-4 text-sm text-navy-200">
        <div className="flex items-start gap-2.5">
          <span className="text-base">🤖</span>
          <p>
            Փլեյ-օֆֆի խաղերը ստեղծվում և թարմացվում են <strong className="text-emerald-400 font-bold">ավտոմատ</strong>՝ ըստ խմբային
            փուլի արդյունքների և FIFA կանոնների։ Դրանք հնարավոր չէ ձեռքով ավելացնել, փոփոխել կամ հեռացնել։
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Բոլոր խաղերը ({matches.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {matches.length === 0 ? (
            <p className="py-4 text-center text-sm text-navy-300">Դեռ խաղեր չկան։</p>
          ) : (
            matches.map((m) => {
              const isKO = m.stage === STAGES.KNOCKOUT;
              return (
                <Link
                  key={m.id}
                  href={`/matches/${m.id}`}
                  title="Դիտել կանխատեսումները"
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-gold-500/20 hover:bg-white/[0.04]"
                >
                  <span className="w-9 shrink-0 text-xs font-bold text-navy-500">#{m.matchNumber}</span>
                  <Badge variant={isKO ? "info" : "muted"} className="shrink-0">
                    {isKO ? ROUND_LABELS[(m.round as Round) ?? "R32"] : `Խումբ ${m.groupCode}`}
                  </Badge>
                  <div className="grid min-w-0 flex-1 basis-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:basis-0">
                    <TeamChip name={m.homeTeam?.name} seedLabel={m.homeSeedLabel} align="right" />
                    <span className="text-xs text-navy-500">vs</span>
                    <TeamChip name={m.awayTeam?.name} seedLabel={m.awaySeedLabel} />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="text-xs text-navy-400 tabular-nums">{formatDateTime(m.scheduledAt)}</span>
                    <Badge variant={m.status === "FINISHED" ? "success" : "warning"} className="text-xs">
                      {m.status === "FINISHED" ? "Ավարտված" : "Սպասվող"}
                    </Badge>
                    <Badge variant="success" className="border-navy-800 bg-navy-900 text-gold-400">
                      🔮 {m._count.predictions}
                    </Badge>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
