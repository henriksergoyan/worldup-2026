import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTournament } from "@/lib/standings";
import {
  canRevealPredictions,
  getDeadlineMap,
  predictionsRevealAt,
} from "@/lib/deadlines";
import { scoreNormalPrediction, scoreKnockoutMatch, knockoutInputFromGoals } from "@/lib/scoring";
import { MatchArena, type ArenaPrediction } from "@/components/match-arena";
import { STAGES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const tournament = await getActiveTournament();

  const match = await prisma.match.findFirst({
    where: { id, tournamentId: tournament.id },
    include: {
      homeTeam: true,
      awayTeam: true,
      actualResult: true,
      predictions: {
        include: {
          user: { select: { id: true, name: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!match) notFound();

  const {
    id: matchId,
    matchNumber,
    stage,
    round,
    groupCode,
    scheduledAt,
    homeTeam,
    awayTeam,
    homeTeamId,
    awayTeamId,
    homeSeedLabel,
    awaySeedLabel,
    actualResult,
    predictions,
  } = match;

  const [totalPlayers, deadlines] = await Promise.all([
    prisma.user.count({ where: { role: "PLAYER", active: true } }),
    getDeadlineMap(tournament.id),
  ]);

  const isAdmin = user.role === "ADMIN";
  const canReveal = canRevealPredictions(
    { stage, round, matchNumber, scheduledAt },
    { isAdmin, kickoffLockMinutes: tournament.kickoffLockMinutes, deadlines },
  );
  const revealAt = predictionsRevealAt(
    { stage, round, matchNumber, scheduledAt },
    deadlines,
    tournament.kickoffLockMinutes,
  );

  const finalized = actualResult?.finalized ?? false;
  const actual = actualResult;

  function pointsFor(pred: (typeof predictions)[number]): number | null {
    if (!finalized || !actual) return null;
    if (stage === STAGES.GROUP) {
      return scoreNormalPrediction(
        { home: pred.normalHomeGoals, away: pred.normalAwayGoals },
        { home: actual.normalHomeGoals, away: actual.normalAwayGoals },
      ).points;
    }
    return scoreKnockoutMatch(
      knockoutInputFromGoals(pred, pred.predictedWinnerTeamId, homeTeamId, awayTeamId),
      knockoutInputFromGoals(actual, actual.winnerTeamId, homeTeamId, awayTeamId),
    ).points;
  }

  const arenaPreds: ArenaPrediction[] = predictions
    .filter((p) => p.normalHomeGoals !== null && p.normalAwayGoals !== null)
    .map((p) => ({
      userId: p.user.id,
      name: p.user.name,
      home: p.normalHomeGoals!,
      away: p.normalAwayGoals!,
      extraHome: stage === STAGES.KNOCKOUT ? p.extraHomeGoals : undefined,
      extraAway: stage === STAGES.KNOCKOUT ? p.extraAwayGoals : undefined,
      penaltyHome: stage === STAGES.KNOCKOUT ? p.penaltyHomeGoals : undefined,
      penaltyAway: stage === STAGES.KNOCKOUT ? p.penaltyAwayGoals : undefined,
      points: canReveal || p.user.id === user.id ? pointsFor(p) : null,
      isMe: p.user.id === user.id,
    }));

  // Hide others' scores until reveal window (admin always sees all).
  const visiblePreds =
    canReveal || isAdmin
      ? arenaPreds
      : arenaPreds.filter((p) => p.isMe);

  return (
    <div className="space-y-4">
      <MatchArena
        matchId={matchId}
        matchNumber={matchNumber}
        stage={stage}
        round={round}
        groupCode={groupCode}
        scheduledAt={scheduledAt.toISOString()}
        homeName={homeTeam?.name ?? null}
        awayName={awayTeam?.name ?? null}
        homeSeedLabel={homeSeedLabel}
        awaySeedLabel={awaySeedLabel}
        actual={
          finalized && actual
            ? stage === STAGES.KNOCKOUT
              ? {
                  normalHome: actual.normalHomeGoals,
                  normalAway: actual.normalAwayGoals,
                  extraHome: actual.extraHomeGoals,
                  extraAway: actual.extraAwayGoals,
                  penaltyHome: actual.penaltyHomeGoals,
                  penaltyAway: actual.penaltyAwayGoals,
                }
              : { home: actual.normalHomeGoals!, away: actual.normalAwayGoals! }
            : null
        }
        finalized={finalized}
        canReveal={canReveal || isAdmin}
        lockAt={revealAt.toISOString()}
        myUserId={user.id}
        predictions={visiblePreds}
        predictionsCount={arenaPreds.length}
        totalPlayers={totalPlayers}
      />
    </div>
  );
}
