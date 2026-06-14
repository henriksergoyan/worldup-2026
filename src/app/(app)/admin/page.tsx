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
    { label: "Players", value: playerCount, sub: `${paidCount} paid` },
    { label: "Teams", value: teamCount },
    { label: "Matches", value: matchCount, sub: `${finalizedCount} finalized` },
    { label: "Predictions", value: predictionCount },
    { label: "Prize pool", value: formatAMD(standings.prizePool), accent: "text-gold-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-white md:text-3xl">Admin Console</h1>
          <p className="text-sm text-navy-300">{tournament.name}</p>
        </div>
        <div className="flex gap-2">
          <RecalcButton />
          <a href="/api/admin/export" target="_blank" rel="noreferrer">
            <Button variant="outline">⬇︎ Export JSON</Button>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <QuickLink href="/admin/results" icon="⚽" title="Enter results" desc="Set actual scores and finalize matches." />
        <QuickLink href="/admin/users" icon="👥" title="Manage players" desc="Mark paid status and toggle access." />
        <QuickLink href="/admin/teams" icon="🏳️" title="Teams & qualifiers" desc="Edit teams, set qualifiers and champion." />
        <QuickLink href="/admin/fixtures" icon="📅" title="Fixtures" desc="Create knockout matches as teams are known." />
        <QuickLink href="/admin/deadlines" icon="⏰" title="Deadlines" desc="Lock or reopen prediction phases." />
        <QuickLink href="/admin/settings" icon="⚙️" title="Settings" desc="Entry fee, prize split and pick count." />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top of the table</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {standings.leaderboard.slice(0, 5).map((e) => (
            <div key={e.userId} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2 text-sm">
              <span className="text-white">
                <span className="mr-2 font-bold text-navy-400">{e.rank}</span>
                {e.name}
              </span>
              <span className="font-bold text-pitch-300">{e.totalPoints} pts</span>
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
