import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeStandings, getActiveTournament } from "@/lib/standings";
import { getDeadlineMap, nextDeadline } from "@/lib/deadlines";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamChip } from "@/components/team-chip";
import { formatDateTime, formatAMD } from "@/lib/utils";
import { DeadlineNotifications } from "@/components/deadline-notifications";
import { Countdown } from "@/components/countdown";
import { ChampionHero } from "@/components/champion-hero";
import { PHASE_LABELS, PLAYER_DEADLINE_PHASES, TEAM_PICK_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-navy-400">{label}</div>
      <div className={`mt-2 text-3xl font-black tabular-nums ${accent ?? "text-white"}`}>{value}</div>
      {sub && <div className="mt-1 text-sm text-navy-300">{sub}</div>}
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const tournament = await getActiveTournament();

  const [{ leaderboard, breakdownByUser }, deadlines, totalMatches, championPick, qualifierCount, recentResults, actualChampion] =
    await Promise.all([
      computeStandings(tournament.id),
      getDeadlineMap(tournament.id),
      prisma.match.count({ where: { tournamentId: tournament.id } }),
      prisma.teamPick.findFirst({
        where: { userId: user.id, tournamentId: tournament.id, type: TEAM_PICK_TYPES.CHAMPION },
        include: { team: true },
      }),
      prisma.teamPick.count({
        where: { userId: user.id, tournamentId: tournament.id, type: TEAM_PICK_TYPES.KNOCKOUT_QUALIFIER },
      }),
      prisma.match.findMany({
        where: { tournamentId: tournament.id, actualResult: { finalized: true } },
        include: {
          homeTeam: true,
          awayTeam: true,
          actualResult: true,
          predictions: { where: { userId: user.id } },
        },
        orderBy: { scheduledAt: "desc" },
        take: 5,
      }),
      prisma.actualTeamStatus.findFirst({
        where: { tournamentId: tournament.id, champion: true },
        select: { teamId: true },
      }),
    ]);

  const me = breakdownByUser[user.id];
  const myRank = leaderboard.find((e) => e.userId === user.id);
  const next = nextDeadline(deadlines);
  const predictionsMade = me?.predictionsMade ?? 0;
  const pct = totalMatches > 0 ? Math.round((predictionsMade / totalMatches) * 100) : 0;

  const deadlineItems = PLAYER_DEADLINE_PHASES.flatMap((phase) => {
    const d = deadlines.get(phase);
    if (!d?.lockAt) return [];
    return [
      {
        phase,
        lockAt: d.lockAt.toISOString(),
        locked: d.locked,
        isOpen: d.isOpen,
      },
    ];
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-white md:text-3xl">
            Բարի վերադարձ, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-navy-300">{tournament.name} · Էքսպերտների լիգա</p>
        </div>
        <Link href="/predictions">
          <Button>Կատարել կանխատեսումներ ✍️ →</Button>
        </Link>
      </div>

      <ChampionHero
        teamName={championPick?.team.name ?? null}
        groupCode={championPick?.team.groupCode ?? null}
        championPoints={me?.championPoints ?? 0}
        isActualChampion={!!championPick && actualChampion?.teamId === championPick.teamId}
        hasPick={!!championPick}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Միավորներ"
          value={me?.totalPoints ?? 0}
          accent="text-pitch-400"
          sub={`${me?.exactScoreHits ?? 0} ճիշտ հաշիվ · ${me?.correctOutcomes ?? 0} ելք`}
        />
        <Stat
          label="Դիրքը մրցաշարային աղյուսակում"
          value={myRank ? `#${myRank.rank}` : "—"}
          sub={`${leaderboard.length} մասնակցից`}
        />
        <Stat
          label="Հաջորդ վերջնաժամկետը"
          value={
            next?.lockAt ? (
              <Countdown target={next.lockAt} mode="days" prefix="— " className="text-3xl text-white" />
            ) : (
              "—"
            )
          }
          sub={next ? PHASE_LABELS[next.phase] : "Բոլոր խաղերը փակված են"}
        />
        <Stat
          label="Հնարավոր մրցանակ"
          value={myRank && myRank.prizeAmount > 0 ? formatAMD(myRank.prizeAmount) : "—"}
          accent="text-gold-400"
          sub={myRank && myRank.prizeAmount > 0 ? "եթե դիրքերը պահպանվեն" : "դեռ մրցանակային տեղերում չեք"}
        />
      </div>

      <DeadlineNotifications deadlines={deadlineItems} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Կանխատեսումներ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-navy-300">Կատարված կանխատեսումներ</span>
                <span className="font-semibold text-white">
                  {predictionsMade}/{totalMatches}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pitch-600 to-pitch-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Link href="/predictions?tab=group" className="group">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition group-hover:border-pitch-500/40">
                  <div className="text-2xl">🏟️</div>
                  <div className="mt-1 text-sm font-semibold text-white">Խմբային փուլ</div>
                </div>
              </Link>
              <Link href="/predictions?tab=knockout" className="group">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition group-hover:border-pitch-500/40">
                  <div className="text-2xl">🥅</div>
                  <div className="mt-1 text-sm font-semibold text-white">Փլեյ-օֆֆեր</div>
                </div>
              </Link>
              <Link href="/champion" className="group">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition group-hover:border-pitch-500/40">
                  <div className="text-2xl">🏆</div>
                  <div className="mt-1 text-sm font-semibold text-white">Չեմպիոնի կանխատեսում</div>
                  <div className="mt-2 text-[11px] font-medium text-gold-400/90 group-hover:text-gold-300">
                    Տեսնել բոլորի ընտրությունները →
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Առաջատարներ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.slice(0, 6).map((e) => (
              <div
                key={e.userId}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  e.userId === user.id ? "bg-pitch-500/10 ring-1 ring-pitch-500/30" : "bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-center font-bold text-navy-400">{e.rank}</span>
                  <span className="font-semibold text-white">{e.name}</span>
                </div>
                <span className="font-bold tabular-nums text-pitch-300">{e.totalPoints} միավոր</span>
              </div>
            ))}
            <Link href="/leaderboard" className="block pt-1">
              <Button variant="ghost" size="sm" className="w-full">
                Տեսնել ամբողջ աղյուսակը →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Վերջին խաղերի արդյունքները ⚽</CardTitle>
        </CardHeader>
        <CardContent>
          {recentResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="text-4xl">⏳</div>
              <p className="mt-2 text-sm text-navy-300">
                Արդյունքներ դեռ չկան: Միավորները կհաշվարկվեն, երբ ադմինիստրատորը մուտքագրի խաղերի վերջնական արդյունքները:
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentResults.map((m) => {
                const pred = m.predictions[0] ?? null;
                return (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2.5 transition hover:bg-white/[0.05]"
                  >
                    <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <TeamChip name={m.homeTeam?.name} seedLabel={m.homeSeedLabel} align="right" />
                      <div className="flex flex-col items-center">
                        <span className="rounded-lg bg-navy-900 px-2.5 py-1 text-sm font-bold tabular-nums text-white">
                          {m.actualResult?.normalHomeGoals}–{m.actualResult?.normalAwayGoals}
                        </span>
                        {pred && (
                          <span className="mt-1 text-[10px] font-semibold text-pitch-300">
                            Կանխատեսումը՝ {pred.normalHomeGoals}–{pred.normalAwayGoals}
                          </span>
                        )}
                      </div>
                      <TeamChip name={m.awayTeam?.name} seedLabel={m.awaySeedLabel} />
                    </div>
                    <Badge variant="success">+{me?.matchPoints[m.id] ?? 0} միավոր</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
