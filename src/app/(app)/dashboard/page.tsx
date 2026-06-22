import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeStandings, getActiveTournament } from "@/lib/standings";
import { getDeadlineMap, isMatchLocked, matchEditLockAt, nextDeadline } from "@/lib/deadlines";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamChip } from "@/components/team-chip";
import { formatDateTime, formatAMD } from "@/lib/utils";
import { DeadlineNotifications } from "@/components/deadline-notifications";
import { Countdown } from "@/components/countdown";
import { ChampionHero } from "@/components/champion-hero";
import { PHASE_LABELS, PLAYER_DEADLINE_PHASES, ROUND_LABELS, STAGES, TEAM_PICK_TYPES, type Round } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { pickUpcomingMatches, isMatchLive, UPCOMING_MATCH_VISIBLE_AFTER_KICKOFF_MS } from "@/lib/upcoming-matches";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  sub,
  accent,
  variant = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
  variant?: "default" | "deadline";
}) {
  return (
    <Card
      className={cn(
        "p-4 sm:p-5",
        variant === "deadline" &&
          "border-amber-500/35 bg-gradient-to-br from-amber-500/12 via-amber-950/20 to-transparent",
      )}
    >
      <div
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wider sm:text-xs",
          variant === "deadline" ? "text-amber-300/90" : "text-navy-400",
        )}
      >
        {label}
      </div>
      <div className={`mt-2 text-2xl font-black tabular-nums sm:text-3xl ${accent ?? "text-white"}`}>{value}</div>
      {sub != null && sub !== "" && (
        <div
          className={cn(
            "mt-1 text-xs sm:text-sm",
            variant === "deadline" ? "text-amber-200/80" : "text-navy-300",
          )}
        >
          {sub}
        </div>
      )}
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const tournament = await getActiveTournament();

  const [{ leaderboard, breakdownByUser }, deadlines, totalMatches, championPick, qualifierCount, recentResults, actualChampion, upcomingPool] =
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
      prisma.match.findMany({
        where: {
          tournamentId: tournament.id,
          NOT: { actualResult: { finalized: true } },
          scheduledAt: { gt: new Date(Date.now() - UPCOMING_MATCH_VISIBLE_AFTER_KICKOFF_MS) },
        },
        include: {
          homeTeam: true,
          awayTeam: true,
          actualResult: true,
          predictions: { where: { userId: user.id } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 24,
      }),
    ]);

  const upcomingMatches = pickUpcomingMatches(
    upcomingPool,
    deadlines,
    tournament.kickoffLockMinutes,
    3,
  );

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
          label="Դիրքն աղյուսակում"
          value={myRank ? `#${myRank.rank}` : "—"}
          sub={`${leaderboard.length} մասնակցից`}
        />
        <Stat
          label="Հաջորդ վերջնաժամկետ"
          variant="deadline"
          value={
            next?.lockAt ? (
              <Countdown
                target={next.lockAt}
                mode="days"
                daysSuffix="ից"
                className="text-2xl text-amber-100 sm:text-3xl"
              />
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
          sub={myRank && myRank.prizeAmount > 0 ? "եթե դիրքը պահպանվի" : "դեռ մրցանակային տեղում չեք"}
        />
      </div>

      <Card className="overflow-hidden border-pitch-500/30 bg-gradient-to-br from-pitch-500/[0.08] via-transparent to-transparent">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <span>📅</span> Սպասվող և ընթացիկ խաղեր
              </CardTitle>
              <p className="mt-1 text-xs text-navy-300 sm:text-sm">
                Մոտակա խաղերը և այն խաղերը, որոնք արդեն մեկնարկել են (ցուցադրվում են մինչև 2 ժամ kickoff-ից հետո)
              </p>
            </div>
            <Link href="/predictions">
              <Button variant="outline" size="sm">
                Բոլոր կանխատեսումները →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingMatches.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center">
              <div className="text-3xl">✅</div>
              <p className="mt-2 text-sm font-semibold text-white">Այս պահին սպասվող խաղեր չկան</p>
              <p className="mt-1 text-xs text-navy-400">Մոտակա բոլոր խաղերն ավարտվել են կամ կանխատեսումներն արդեն փակ են:</p>
            </div>
          ) : (
            upcomingMatches.map((m) => {
              const pred = m.predictions[0] ?? null;
              const hasPred =
                pred != null && pred.normalHomeGoals != null && pred.normalAwayGoals != null;
              const locked = isMatchLocked(m, deadlines, tournament.kickoffLockMinutes);
              const live = isMatchLive(m);
              const lockAt = matchEditLockAt(m.scheduledAt, tournament.kickoffLockMinutes);
              const stageLabel =
                m.stage === STAGES.KNOCKOUT
                  ? ROUND_LABELS[(m.round as Round) ?? "R32"]
                  : `Խումբ ${m.groupCode}`;

              return (
                <Link
                  key={m.id}
                  href={!hasPred && !locked ? "/predictions" : `/matches/${m.id}`}
                  className="block rounded-xl border border-white/10 bg-navy-950/40 p-3 transition hover:border-pitch-500/40 hover:bg-white/[0.04] sm:p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-navy-400">
                    <span>
                      #{m.matchNumber} · {stageLabel}
                    </span>
                    <span className="tabular-nums">{formatDateTime(m.scheduledAt)}</span>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                    <TeamChip name={m.homeTeam?.name} seedLabel={m.homeSeedLabel} align="right" />
                    <div className="flex flex-col items-center gap-1">
                      {hasPred ? (
                        <span className="rounded-lg bg-pitch-500/15 px-2.5 py-1 text-lg font-black tabular-nums text-pitch-200 ring-1 ring-pitch-500/30">
                          {pred!.normalHomeGoals}–{pred!.normalAwayGoals}
                        </span>
                      ) : (
                        <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-sm font-bold text-amber-200 ring-1 ring-amber-500/30">
                          ?
                        </span>
                      )}
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">vs</span>
                    </div>
                    <TeamChip name={m.awayTeam?.name} seedLabel={m.awaySeedLabel} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    {hasPred ? (
                      <span className="text-xs font-semibold text-pitch-300">✓ Կանխատեսված է</span>
                    ) : locked ? (
                      <span className="text-xs font-semibold text-navy-400">Կանխատեսումներն արդեն փակ են</span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-300">⚠️ Կանխատեսումը լրացված չէ</span>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {live && <Badge variant="danger">🔴 Ընթացքում</Badge>}
                      {locked ? (
                        <Badge variant="muted">🔒 Փակ է</Badge>
                      ) : (
                        <Badge variant="warning">
                          Մնացել է՝ <Countdown target={lockAt} mode="days" className="inline text-inherit" />
                        </Badge>
                      )}
                      {!hasPred && !locked && <Badge variant="info">Լրացնել →</Badge>}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

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
            <CardTitle>Վերջին արդյունքները ⚽</CardTitle>
          </CardHeader>
          <CardContent>
            {recentResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="text-4xl">⏳</div>
                <p className="mt-2 text-sm text-navy-300">
                  Արդյունքներ դեռ չկան: Միավորները կհաշվարկվեն, երբ ադմինիստրատորը հաստատի խաղերի արդյունքները:
                </p>
              </div>
          ) : (
            <div className="space-y-2">
              {recentResults.map((m) => {
                const pred = m.predictions[0] ?? null;
                const hasPred =
                  pred != null && pred.normalHomeGoals != null && pred.normalAwayGoals != null;
                const pts = me?.matchPoints[m.id] ?? 0;
                const won = pts > 0;
                const lost = hasPred && !won;
                return (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition",
                      won
                        ? "border-pitch-500/30 bg-pitch-500/[0.05] hover:bg-pitch-500/[0.09]"
                        : lost
                          ? "border-red-500/25 bg-red-500/[0.04] hover:bg-red-500/[0.08]"
                          : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]",
                    )}
                  >
                    <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <TeamChip name={m.homeTeam?.name} seedLabel={m.homeSeedLabel} align="right" />
                      <div className="flex flex-col items-center gap-1">
                        <span className="rounded-lg bg-navy-900 px-2.5 py-1 text-sm font-bold tabular-nums text-white">
                          {m.actualResult?.normalHomeGoals}–{m.actualResult?.normalAwayGoals}
                        </span>
                        {hasPred ? (
                          <span
                            className={cn(
                              "rounded px-1.5 text-[10px] font-semibold tabular-nums",
                              won ? "text-pitch-300" : "text-red-300",
                            )}
                          >
                            Ձերը՝ {pred!.normalHomeGoals}–{pred!.normalAwayGoals}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-navy-500">Չեք կանխատեսել</span>
                        )}
                      </div>
                      <TeamChip name={m.awayTeam?.name} seedLabel={m.awaySeedLabel} />
                    </div>
                    {won ? (
                      <Badge variant="success">✓ +{pts}</Badge>
                    ) : lost ? (
                      <Badge variant="muted" className="border-red-500/30 bg-red-500/10 text-red-300">
                        ✗ 0
                      </Badge>
                    ) : (
                      <Badge variant="muted" className="border-white/10 bg-white/5 text-navy-400">
                        —
                      </Badge>
                    )}
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
