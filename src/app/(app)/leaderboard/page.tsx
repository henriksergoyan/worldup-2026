import { requireUser } from "@/lib/auth";
import { computeStandings, getActiveTournament } from "@/lib/standings";
import { computeRankTimeline, getTimelinePlayers } from "@/lib/rank-timeline";
import { LeaderboardClient, type Row } from "@/components/leaderboard-client";
import { RankTimelineChart } from "@/components/rank-timeline-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const user = await requireUser();
  const tournament = await getActiveTournament();
  const isAdmin = user.role === "ADMIN";

  const [{ leaderboard, breakdownByUser, prizePool, paidCount }, timeline, players] =
    await Promise.all([
      computeStandings(tournament.id),
      computeRankTimeline(tournament.id),
      getTimelinePlayers(),
    ]);

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

  const defaultSelected = [
    user.id,
    ...rows.filter((r) => r.userId !== user.id).slice(0, 3).map((r) => r.userId),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white md:text-3xl">Մրցաշարային Աղյուսակ 🏆</h1>
        <p className="text-sm text-navy-300">
          {rows.length} խաղացող · Մրցանակային ֆոնդ՝ {prizePool.toLocaleString()} AMD · {paidCount} հոգի վճարած 💸 · Միավորների հավասարության դեպքում առաջնահերթությունը տրվում է ճշգրիտ հաշվով գուշակումների քանակին։
        </p>
      </div>

      <LeaderboardClient rows={rows} prizePool={prizePool} isAdmin={isAdmin} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">📉 Դիրքի պատմություն</CardTitle>
          <p className="text-xs text-navy-400">
            Ընդհանուր դիրքը յուրաքանչյուր ավարտված խաղից հետո · ընտրեք մինչև 5 խաղացող համեմատության համար
          </p>
        </CardHeader>
        <CardContent>
          <RankTimelineChart timeline={timeline} players={players} defaultSelected={defaultSelected} />
        </CardContent>
      </Card>
    </div>
  );
}
