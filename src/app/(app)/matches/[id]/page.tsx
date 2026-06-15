import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTournament } from "@/lib/standings";
import {
  canRevealPredictions,
  matchEditLockAt,
} from "@/lib/deadlines";
import { scoreNormalPrediction, scoreKnockoutMatch } from "@/lib/scoring";
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
    homeSeedLabel,
    awaySeedLabel,
    actualResult,
    predictions,
  } = match;

  const totalPlayers = await prisma.user.count({ where: { role: "PLAYER", active: true } });

  const isAdmin = user.role === "ADMIN";
  const canReveal = canRevealPredictions({ scheduledAt }, {
    isAdmin,
    kickoffLockMinutes: tournament.kickoffLockMinutes,
  });
  const lockAt = matchEditLockAt(scheduledAt, tournament.kickoffLockMinutes);

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
      {
        normal: { home: pred.normalHomeGoals, away: pred.normalAwayGoals },
        extra: { home: pred.extraHomeGoals, away: pred.extraAwayGoals },
        penalty: { home: pred.penaltyHomeGoals, away: pred.penaltyAwayGoals },
      },
      {
        normal: { home: actual.normalHomeGoals, away: actual.normalAwayGoals },
        extra: { home: actual.extraHomeGoals, away: actual.extraAwayGoals },
        penalty: { home: actual.penaltyHomeGoals, away: actual.penaltyAwayGoals },
      },
    ).points;
  }

  const arenaPreds: ArenaPrediction[] = predictions
    .filter((p) => p.normalHomeGoals !== null && p.normalAwayGoals !== null)
    .map((p) => ({
      userId: p.user.id,
      name: p.user.name,
      home: p.normalHomeGoals!,
      away: p.normalAwayGoals!,
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
            ? { home: actual.normalHomeGoals!, away: actual.normalAwayGoals! }
            : null
        }
        finalized={finalized}
        canReveal={canReveal || isAdmin}
        lockAt={lockAt.toISOString()}
        myUserId={user.id}
        predictions={visiblePreds}
        predictionsCount={arenaPreds.length}
        totalPlayers={totalPlayers}
      />
    </div>
  );
}
