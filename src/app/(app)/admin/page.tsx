import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeStandings, getActiveTournament } from "@/lib/standings";
import { AdminNav } from "@/components/admin/admin-nav";
import { RecalcButton } from "@/components/admin/recalc-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatAMD } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const tournament = await getActiveTournament();

  const [playerCount, paidCount, teamCount, matchCount, finalizedCount, predictionCount, standings] =
    await Promise.all([
      prisma.user.count({ where: { role: "PLAYER" } }),
      prisma.user.count({ where: { role: "PLAYER", paid: true } }),
      prisma.team.count({ where: { tournamentId: tournament.id } }),
      prisma.match.count({ where: { tournamentId: tournament.id } }),
      prisma.actualResult.count({ where: { finalized: true } }),
      prisma.prediction.count(),
      computeStandings(tournament.id),
    ]);

  const stats = [
    { label: "Մասնակիցներ", value: playerCount, sub: `${paidCount} վճարած` },
    { label: "Թիմեր", value: teamCount },
    { label: "Խաղեր", value: matchCount, sub: `${finalizedCount} վերջնական` },
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-navy-400">{s.label}</div>
            <div className={`mt-2 text-2xl font-black ${s.accent ?? "text-white"}`}>{s.value}</div>
            {s.sub && <div className="mt-1 text-xs text-navy-400">{s.sub}</div>}
          </Card>
        ))}
      </div>

      {/* Explanation of Recalculate button */}
      <Card className="border-amber-500/20 bg-amber-500/[0.02]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-amber-400">
            💡 Ինչու՞ է կարևոր սեղմել «Վերահաշվարկ» կոճակը
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-navy-200">
          <p>
            «Վերահաշվարկ» կոճակը հանդիսանում է համակարգի գլխավոր շարժիչը, որը կատարում է հետևյալ կարևորագույն գործողությունները.
          </p>
          <ul className="list-inside list-disc space-y-1.5 pl-1 text-navy-300">
            <li>
              <strong className="text-white">Ժամկետների համաժամեցում (Sync Deadlines)</strong>. Թարմացնում և ճշգրտում է բոլոր խաղափուլերի կողպման ժամկետները:
            </li>
            <li>
              <strong className="text-white">Փլեյ-օֆֆի թիմերի ավտոմատ որոշում</strong>. Ավտոմատ կերպով հաշվարկում է, թե որ թիմերն են անցնում հաջորդ փուլ (ըստ խմբերում նրանց ցուցադրած արդյունքների և FIFA կանոնների) և մասնակիցներին շնորհում <strong className="text-pitch-300 font-bold">+2 միավոր</strong> յուրաքանչյուր ճիշտ թիմի համար (փլեյ-օֆֆի թիմերի ընտրությունը կատարվում է ավտոմատ, առանց ձեռքով վերջնաժամկետ սահմանելու)։
            </li>
            <li>
              <strong className="text-white">Փլեյ-օֆֆի զանգվածային համալրում (Bracket Propagation)</strong>. Երբ խմբային փուլի խաղերն ավարտվում և վերջնականացվում են, ավտոմատ որոշվում են 1/16 եզրափակչի (Round of 32) զույգերը, և մասնակիցների միավորները վերահաշվարկվում են։
            </li>
            <li>
              <strong className="text-white">Մրցաշարային աղյուսակի թարմացում (Leaderboard)</strong>. Վերահաշվարկում է բոլոր մասնակիցների ընդհանուր միավորները, ճշգրիտ հաշիվների քանակը և տեղերը մրցաշարային աղյուսակում։
            </li>
          </ul>
          <p className="pt-1 text-xs text-navy-400 italic">
            * Խորհուրդ է տրվում սեղմել «Վերահաշվարկ» ցանկացած կարևոր արդյունք մուտքագրելուց կամ փոփոխություն կատարելուց հետո։
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <QuickLink
          href="/admin/results"
          icon="⚽"
          title="Արդյունքների մուտք"
          desc="Մուտքագրեք արդյունական հաշիվները և վերջնականացրեք խաղերը։"
        />
        <QuickLink
          href="/admin/users"
          icon="👥"
          title="Մասնակիցների կառավարում"
          desc="Նշեք վճարման կարգավիճակը և մուտքի իրավասությունը։"
        />
        <QuickLink
          href="/admin/teams"
          icon="🏳️"
          title="Թիմեր և փլեյ-օֆ"
          desc="Խմբագրեք թիմերը, նշեք փլեյ-օֆ անցած և չեմպիոն թիմը։"
        />
        <QuickLink
          href="/admin/fixtures"
          icon="📅"
          title="Խաղացուցակ"
          desc="Ավելացրեք փլեյ-օֆ խաղերը, երբ թիմերը հայտնի դառնան։"
        />
        <QuickLink
          href="/admin/deadlines"
          icon="⏰"
          title="Ժամկետներ"
          desc="Փակեք կամ վերաբացեք կանխատեսման փուլերը։"
        />
        <QuickLink
          href="/admin/settings"
          icon="⚙️"
          title="Կարգավորումներ"
          desc="Մասնակցության վարձ, մրցանակների բաշխում և ընտրությունների թիվ։"
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
