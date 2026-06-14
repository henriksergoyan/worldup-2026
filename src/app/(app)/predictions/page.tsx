import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTournament, computeStandings } from "@/lib/standings";
import { getDeadlineMap, isMatchLocked, phaseForMatch } from "@/lib/deadlines";
import { PredictionsTabs } from "@/components/predictions/predictions-tabs";
import { PHASES, STAGES, TEAM_PICK_TYPES, type Phase } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PredictionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const tournament = await getActiveTournament();
  const { tab } = await searchParams;

  const [matches, teams, picks, deadlines, standings] = await Promise.all([
    prisma.match.findMany({
      where: { tournamentId: tournament.id },
      include: {
        homeTeam: true,
        awayTeam: true,
        actualResult: true,
        predictions: { where: { userId: user.id } },
      },
      orderBy: { matchNumber: "asc" },
    }),
    prisma.team.findMany({
      where: { tournamentId: tournament.id },
      orderBy: [{ groupCode: "asc" }, { name: "asc" }],
    }),
    prisma.teamPick.findMany({ where: { userId: user.id, tournamentId: tournament.id } }),
    getDeadlineMap(tournament.id),
    computeStandings(tournament.id),
  ]);

  const matchPoints = standings.breakdownByUser[user.id]?.matchPoints ?? {};

  const toDTO = (m: (typeof matches)[number]) => {
    const pred = m.predictions[0] ?? null;
    const locked = isMatchLocked(m, deadlines, tournament.kickoffLockMinutes);
    const actual = m.actualResult;
    const finalized = actual?.finalized ?? false;
    return {
      id: m.id,
      matchNumber: m.matchNumber,
      stage: m.stage,
      round: m.round,
      groupCode: m.groupCode,
      scheduledAt: m.scheduledAt.toISOString(),
      homeName: m.homeTeam?.name ?? null,
      awayName: m.awayTeam?.name ?? null,
      homeSeedLabel: m.homeSeedLabel,
      awaySeedLabel: m.awaySeedLabel,
      locked,
      phase: phaseForMatch(m),
      pred: pred
        ? {
            normalHome: pred.normalHomeGoals,
            normalAway: pred.normalAwayGoals,
            extraHome: pred.extraHomeGoals,
            extraAway: pred.extraAwayGoals,
            penaltyHome: pred.penaltyHomeGoals,
            penaltyAway: pred.penaltyAwayGoals,
            winner:
              pred.predictedWinnerTeamId === m.homeTeamId && m.homeTeamId
                ? ("HOME" as const)
                : pred.predictedWinnerTeamId === m.awayTeamId && m.awayTeamId
                  ? ("AWAY" as const)
                  : null,
          }
        : null,
      actual: finalized
        ? {
            normalHome: actual!.normalHomeGoals,
            normalAway: actual!.normalAwayGoals,
          }
        : null,
      points: finalized ? (matchPoints[m.id] ?? 0) : null,
    };
  };

  const groupMatches = matches.filter((m) => m.stage === STAGES.GROUP).map(toDTO);
  const knockoutMatches = matches.filter((m) => m.stage === STAGES.KNOCKOUT).map(toDTO);

  const championPick = picks.find((p) => p.type === TEAM_PICK_TYPES.CHAMPION)?.teamId ?? null;
  const qualifierPicks = picks
    .filter((p) => p.type === TEAM_PICK_TYPES.KNOCKOUT_QUALIFIER)
    .map((p) => p.teamId);

  const lockInfo = (phase: Phase) => {
    const d = deadlines.get(phase);
    return { locked: d?.locked ?? false, lockAt: d?.lockAt?.toISOString() ?? null };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white md:text-3xl">My Predictions</h1>
        <p className="text-sm text-navy-300">
          Enter your scores before each phase locks. Points appear once results are finalized.
        </p>
      </div>

      <PredictionsTabs
        initialTab={tab}
        groupMatches={groupMatches}
        knockoutMatches={knockoutMatches}
        teams={teams.map((t) => ({ id: t.id, name: t.name, groupCode: t.groupCode }))}
        championPick={championPick}
        qualifierPicks={qualifierPicks}
        pickLimit={tournament.knockoutPickCount}
        championLock={lockInfo(PHASES.CHAMPION)}
        teamsLock={{ locked: false, lockAt: null }}
      />
    </div>
  );
}
