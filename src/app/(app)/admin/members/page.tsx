import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeStandings, getActiveTournament } from "@/lib/standings";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMemberLink } from "@/components/rank-outlook-panel";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  await requireAdmin();
  const tournament = await getActiveTournament();
  const { leaderboard, breakdownByUser } = await computeStandings(tournament.id);

  const users = await prisma.user.findMany({
    where: { role: "PLAYER" },
    orderBy: { name: "asc" },
  });

  const rankByUser = new Map(leaderboard.map((e) => [e.userId, e]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white md:text-3xl">Մասնակիցների կանխատեսումներ</h1>
        <p className="text-sm text-navy-300">
          Սեղմեք անունի վրա՝ տեսնելու համար ամբողջական կանխատեսումները, միավորները և արդյունքները։
        </p>
      </div>

      <AdminNav />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase text-navy-400">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Խաղացող</th>
                <th className="px-4 py-3 text-right">Միավոր</th>
                <th className="px-4 py-3 text-right">Կանխատեսումներ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const entry = rankByUser.get(u.id);
                const bd = breakdownByUser[u.id];
                return (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-bold text-navy-300">{entry?.rank ?? "—"}</td>
                    <td className="px-4 py-3">
                      <AdminMemberLink userId={u.id} name={u.name} />
                      {!u.active && (
                        <Badge variant="muted" className="ml-2">
                          ոչ ակտիվ
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-pitch-300">
                      {entry?.totalPoints ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-navy-300">
                      {bd?.predictionsMade ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/members/${u.id}`}
                        className="text-xs font-semibold text-pitch-400 hover:text-pitch-300"
                      >
                        Դիտել →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
