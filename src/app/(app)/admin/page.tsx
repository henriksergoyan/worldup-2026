import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeStandings, getActiveTournament } from "@/lib/standings";
import { AdminNav } from "@/components/admin/admin-nav";
import { RecalcButton } from "@/components/admin/recalc-button";
import { AdminQuickResults, type QuickResultMatch } from "@/components/admin/admin-quick-results";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatAMD } from "@/lib/utils";
import { AdminMemberLink } from "@/components/admin-member-link";
import { MATCH_STATUS } from "@/lib/constants";
import { getDeadlineCompletionReport } from "@/lib/deadline-completion";
import { DeadlineCompletionPanel } from "@/components/admin/deadline-completion-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const tournament = await getActiveTournament();
  const now = new Date();

  const [playerCount, paidCount, matchCount, finishedCount, predictionCount, standings, kickedOffMatches, deadlineCompletion] =
    await Promise.all([
      prisma.user.count({ where: { role: "PLAYER" } }),
      prisma.user.count({ where: { role: "PLAYER", paid: true } }),
      prisma.match.count({ where: { tournamentId: tournament.id } }),
      prisma.match.count({
        where: { tournamentId: tournament.id, status: MATCH_STATUS.FINISHED },
      }),
      prisma.prediction.count(),
      computeStandings(tournament.id),
      prisma.match.findMany({
        where: {
          tournamentId: tournament.id,
          scheduledAt: { lte: now },
        },
        include: { homeTeam: true, awayTeam: true, actualResult: true },
        orderBy: { scheduledAt: "desc" },
        take: 48,
      }),
      getDeadlineCompletionReport(tournament.id),
    ]);

  const pendingCount = matchCount - finishedCount;

  const quickResultMatches: QuickResultMatch[] = kickedOffMatches.map((m) => {
    const r = m.actualResult;
    return {
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
      normalHome: r?.normalHomeGoals ?? null,
      normalAway: r?.normalAwayGoals ?? null,
      extraHome: r?.extraHomeGoals ?? null,
      extraAway: r?.extraAwayGoals ?? null,
      penaltyHome: r?.penaltyHomeGoals ?? null,
      penaltyAway: r?.penaltyAwayGoals ?? null,
      winner:
        r?.winnerTeamId === m.homeTeamId && m.homeTeamId
          ? ("HOME" as const)
          : r?.winnerTeamId === m.awayTeamId && m.awayTeamId
            ? ("AWAY" as const)
            : null,
      finalized: r?.finalized ?? false,
    };
  });

  const stats = [
    { label: "Մասնակիցներ", value: playerCount, sub: `${paidCount} վճարած` },
    {
      label: "Խաղեր",
      value: matchCount,
      sub: `${finishedCount} ավարտված · ${pendingCount} սպասվող`,
    },
    { label: "Կանխատեսումներ", value: predictionCount },
    { label: "Մրցանակային ֆոնդ", value: formatAMD(standings.prizePool), accent: "text-gold-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-white md:text-3xl">Ադմինիստրացիայի վահանակ</h1>
          <p className="text-sm text-navy-300">
            {tournament.name} · մասնակիցների, արդյունքների և կարգավորումների կառավարում։ Լիգայում խաղալու համար «Մասնակիցներ»
            բաժնում ստեղծեք առանձին խաղացողի պրոֆիլ։
          </p>
        </div>
        <div className="flex gap-2">
          <RecalcButton />
          <a href="/api/admin/export" target="_blank" rel="noreferrer">
            <Button variant="outline">JSON արտահանում</Button>
          </a>
        </div>
      </div>

      <AdminNav />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 sm:p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-400 sm:text-xs">{s.label}</div>
            <div className={`mt-2 text-xl font-black sm:text-2xl ${s.accent ?? "text-white"}`}>{s.value}</div>
            {s.sub && <div className="mt-1 text-xs text-navy-400">{s.sub}</div>}
          </Card>
        ))}
      </div>

      <DeadlineCompletionPanel report={deadlineCompletion} />

      {/* Matches that already kicked off and still need results */}
      <Card className="overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] via-transparent to-transparent">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <span>⏱️</span> Արդյունքների մուտք
              </CardTitle>
              <p className="mt-1 text-xs text-navy-300 sm:text-sm">
                Մուտքագրեք կամ ուղղեք հաշիվները — ավարտված խաղերն էլ կարելի է խմբագրել։ Պահպանելիս միավորները վերահաշվարկվում են։
              </p>
            </div>
            <a href="/admin/results">
              <Button variant="outline" size="sm">
                Բոլոր արդյունքները →
              </Button>
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <AdminQuickResults matches={quickResultMatches} />
        </CardContent>
      </Card>

      {/* Explanation of Recalculate button */}
      <Card className="border-emerald-500/20 bg-emerald-500/[0.02] p-4 text-sm text-navy-200">
        <div className="flex items-start gap-2.5">
          <span className="text-base">💡</span>
          <p>
            <strong className="text-white">Կարևոր է.</strong> Խաղերի արդյունքներ կամ փոփոխություններ մուտքագրելուց հետո սեղմեք <strong className="text-emerald-400 font-bold">«Վերահաշվարկ»</strong> կոճակը՝ մասնակիցների միավորները, փլեյ-օֆֆի զույգերը և աղյուսակը ավտոմատ թարմացնելու համար։
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <QuickLink
          href="/admin/results"
          icon="⚽"
          title="Արդյունքների մուտք"
          desc="Մուտքագրեք արդյունական հաշիվները — պահպանելիս միավորները վերահաշվարկվում են ավտոմատ։"
        />
        <QuickLink
          href="/admin/users"
          icon="👥"
          title="Մասնակիցների կառավարում"
          desc="Նշեք վճարման կարգավիճակը և մուտքի իրավասությունը։"
        />
        <QuickLink
          href="/admin/members"
          icon="📋"
          title="Կանխատեսումներ"
          desc="Դիտեք յուրաքանչյուր մասնակցի կանխատեսումներն ու միավորները։"
        />
        <QuickLink
          href="/admin/fixtures"
          icon="📅"
          title="Խաղացուցակ"
          desc="Դիտեք խաղերը և բոլոր մասնակիցների կանխատեսումները։"
        />
        <QuickLink
          href="/admin/deadlines"
          icon="⏰"
          title="Ժամկետներ"
          desc="Փակեք կամ վերաբացեք կանխատեսման փուլերը։"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Աղյուսակի առաջատարներ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {standings.leaderboard.slice(0, 5).map((e) => (
            <div key={e.userId} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2 text-sm">
              <span className="text-white">
                <span className="mr-2 font-bold text-navy-400">{e.rank}</span>
                <AdminMemberLink userId={e.userId} name={e.name} />
              </span>
              <span className="font-bold text-pitch-300">{e.totalPoints} միավոր</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function QuickLink({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} className="group">
      <Card className="h-full p-5 transition group-hover:border-gold-500/30">
        <div className="text-2xl">{icon}</div>
        <div className="mt-2 font-bold text-white">{title}</div>
        <div className="mt-1 text-sm text-navy-300">{desc}</div>
      </Card>
    </Link>
  );
}
