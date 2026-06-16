import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeStandings, getActiveTournament } from "@/lib/standings";
import { AdminNav } from "@/components/admin/admin-nav";
import { RecalcButton } from "@/components/admin/recalc-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeamChip } from "@/components/team-chip";
import { formatAMD, formatDateTime } from "@/lib/utils";
import { MATCH_STATUS, ROUND_LABELS, STAGES, type Round } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const tournament = await getActiveTournament();
  const now = new Date();

  const [playerCount, paidCount, matchCount, finishedCount, predictionCount, standings, awaitingMatches] =
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
          NOT: { actualResult: { finalized: true } },
        },
        include: { homeTeam: true, awayTeam: true },
        orderBy: { scheduledAt: "desc" },
      }),
    ]);

  const pendingCount = matchCount - finishedCount;

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

      {/* Matches that already kicked off and still need results */}
      <Card className="overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] via-transparent to-transparent">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <span>⏱️</span> Սպասում են արդյունքի
              </CardTitle>
              <p className="mt-1 text-xs text-navy-300 sm:text-sm">
                Մեկնարկած, բայց դեռ չլրացված խաղերը — ամենավերջին մեկնարկածը վերևում։
              </p>
            </div>
            <Link href="/admin/results">
              <Button variant="outline" size="sm">
                Արդյունքների մուտք →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {awaitingMatches.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center">
              <div className="text-3xl">✅</div>
              <p className="mt-2 text-sm font-semibold text-white">Բոլոր մեկնարկած խաղերը լրացված են</p>
              <p className="mt-1 text-xs text-navy-400">Նոր խաղ մեկնարկելուն պես այն կհայտնվի այստեղ։</p>
            </div>
          ) : (
            awaitingMatches.map((m) => {
              const isKO = m.stage === STAGES.KNOCKOUT;
              const stageLabel = isKO
                ? ROUND_LABELS[(m.round as Round) ?? "R32"]
                : `Խումբ ${m.groupCode}`;
              return (
                <Link
                  key={m.id}
                  href="/admin/results"
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3 transition hover:border-amber-500/40 hover:bg-amber-500/[0.08]"
                >
                  <span className="w-9 shrink-0 text-xs font-bold text-navy-500">#{m.matchNumber}</span>
                  <Badge variant={isKO ? "info" : "muted"} className="shrink-0">
                    {stageLabel}
                  </Badge>
                  <div className="grid min-w-0 flex-1 basis-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:basis-0">
                    <TeamChip name={m.homeTeam?.name} seedLabel={m.homeSeedLabel} align="right" />
                    <span className="text-xs text-navy-500">vs</span>
                    <TeamChip name={m.awayTeam?.name} seedLabel={m.awaySeedLabel} />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="text-xs text-navy-400 tabular-nums">{formatDateTime(m.scheduledAt)}</span>
                    <Badge variant="warning" className="text-xs">Լրացնել →</Badge>
                  </div>
                </Link>
              );
            })
          )}
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
                {e.name}
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
