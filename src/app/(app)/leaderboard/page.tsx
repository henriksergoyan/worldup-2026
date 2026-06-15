import { requireUser } from "@/lib/auth";
import { computeStandings, getActiveTournament } from "@/lib/standings";
import { LeaderboardClient, type Row } from "@/components/leaderboard-client";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const user = await requireUser();
  const tournament = await getActiveTournament();
  const { leaderboard, breakdownByUser, prizePool, paidCount } = await computeStandings(
    tournament.id,
  );

  const rows: Row[] = leaderboard.map((e) => {
    const bd = breakdownByUser[e.userId];
    return {
      userId: e.userId,
      rank: e.rank,
      name: e.name,
      totalPoints: e.totalPoints,
      groupStagePoints: bd.groupStagePoints,
      knockoutTeamPoints: bd.knockoutTeamPoints,
      knockoutStagePoints: bd.knockoutStagePoints,
      championPoints: bd.championPoints,
      exactScoreHits: bd.exactScoreHits,
      complicatedExactScoreHits: bd.complicatedExactScoreHits,
      correctOutcomes: bd.correctOutcomes,
      prizeAmount: e.prizeAmount,
      isMe: e.userId === user.id,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white md:text-3xl">Մրցաշարային Աղյուսակ 🏆</h1>
        <p className="text-sm text-navy-300">
          {rows.length} խաղացող · Մրցանակային ֆոնդ՝ {prizePool.toLocaleString()} AMD · {paidCount} հոգի վճարած 💸 · Միավորների հավասարության դեպքում առաջնահերթությունը տրվում է ճշգրիտ հաշվով գուշակումների քանակին։
        </p>
      </div>
      <LeaderboardClient rows={rows} prizePool={prizePool} />
    </div>
  );
}
