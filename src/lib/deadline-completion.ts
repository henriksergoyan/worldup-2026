import { prisma } from "./prisma";
import { getDeadlineMap, isMatchLocked, nextDeadline, phaseForMatch } from "./deadlines";
import { isKnockoutPredictionAmbiguous, type Side } from "./scoring";
import { PHASE_LABELS, PHASES, STAGES, TEAM_PICK_TYPES, type Phase } from "./constants";

export type CompletionStatus = "complete" | "partial" | "none";

export interface PlayerDeadlineCompletion {
  userId: string;
  name: string;
  filled: number;
  total: number;
  status: CompletionStatus;
}

export interface DeadlineCompletionReport {
  phase: Phase | null;
  phaseLabel: string;
  lockAt: string | null;
  kind: "matches" | "champion";
  players: PlayerDeadlineCompletion[];
}

function sideFromTeamId(
  teamId: string | null | undefined,
  homeTeamId: string | null,
  awayTeamId: string | null,
): Side | null {
  if (!teamId) return null;
  if (teamId === homeTeamId) return "HOME";
  if (teamId === awayTeamId) return "AWAY";
  return null;
}

function completionStatus(filled: number, total: number): CompletionStatus {
  if (total === 0 || filled >= total) return "complete";
  if (filled === 0) return "none";
  return "partial";
}

type PredRow = {
  userId: string;
  matchId: string;
  normalHomeGoals: number | null;
  normalAwayGoals: number | null;
  extraHomeGoals: number | null;
  extraAwayGoals: number | null;
  penaltyHomeGoals: number | null;
  penaltyAwayGoals: number | null;
  predictedWinnerTeamId: string | null;
};

type MatchRow = {
  id: string;
  stage: string;
  round: string | null;
  matchNumber: number;
  scheduledAt: Date;
  homeTeamId: string | null;
  awayTeamId: string | null;
  actualResult: { finalized: boolean } | null;
};

export function isMatchPredictionComplete(
  pred: PredRow | undefined,
  match: Pick<MatchRow, "stage" | "homeTeamId" | "awayTeamId">,
): boolean {
  if (!pred || pred.normalHomeGoals === null || pred.normalAwayGoals === null) return false;
  if (match.stage !== STAGES.KNOCKOUT) return true;

  return !isKnockoutPredictionAmbiguous({
    normal: { home: pred.normalHomeGoals, away: pred.normalAwayGoals },
    extra: { home: pred.extraHomeGoals, away: pred.extraAwayGoals },
    penalty: { home: pred.penaltyHomeGoals, away: pred.penaltyAwayGoals },
    winner: sideFromTeamId(pred.predictedWinnerTeamId, match.homeTeamId, match.awayTeamId),
  });
}

function sortPlayers(players: PlayerDeadlineCompletion[]): PlayerDeadlineCompletion[] {
  const order: Record<CompletionStatus, number> = { none: 0, partial: 1, complete: 2 };
  return [...players].sort((a, b) => {
    const byStatus = order[a.status] - order[b.status];
    if (byStatus !== 0) return byStatus;
    return a.name.localeCompare(b.name, "hy");
  });
}

const EMPTY_REPORT: DeadlineCompletionReport = {
  phase: null,
  phaseLabel: "",
  lockAt: null,
  kind: "matches",
  players: [],
};

/** Per-player completion for the next open phase deadline (admin view). */
export async function getDeadlineCompletionReport(tournamentId: string): Promise<DeadlineCompletionReport> {
  const tournament = await prisma.tournament.findUniqueOrThrow({ where: { id: tournamentId } });

  const [deadlines, players, matches, predictions, championPicks] = await Promise.all([
    getDeadlineMap(tournamentId),
    prisma.user.findMany({
      where: { role: "PLAYER", active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.match.findMany({
      where: { tournamentId },
      select: {
        id: true,
        stage: true,
        round: true,
        matchNumber: true,
        scheduledAt: true,
        homeTeamId: true,
        awayTeamId: true,
        actualResult: { select: { finalized: true } },
      },
    }),
    prisma.prediction.findMany({
      where: { match: { tournamentId } },
      select: {
        userId: true,
        matchId: true,
        normalHomeGoals: true,
        normalAwayGoals: true,
        extraHomeGoals: true,
        extraAwayGoals: true,
        penaltyHomeGoals: true,
        penaltyAwayGoals: true,
        predictedWinnerTeamId: true,
      },
    }),
    prisma.teamPick.findMany({
      where: { tournamentId, type: TEAM_PICK_TYPES.CHAMPION },
      select: { userId: true },
    }),
  ]);

  const next = nextDeadline(deadlines);
  if (!next?.lockAt) return EMPTY_REPORT;

  const phase = next.phase;
  const phaseLabel = PHASE_LABELS[phase];

  if (phase === PHASES.CHAMPION) {
    const hasChampion = new Set(championPicks.map((p) => p.userId));
    const rows = players.map((u) => {
      const filled = hasChampion.has(u.id) ? 1 : 0;
      const total = 1;
      return {
        userId: u.id,
        name: u.name,
        filled,
        total,
        status: completionStatus(filled, total),
      };
    });
    return {
      phase,
      phaseLabel,
      lockAt: next.lockAt.toISOString(),
      kind: "champion",
      players: sortPlayers(rows),
    };
  }

  const requiredMatches = matches.filter(
    (m) =>
      phaseForMatch(m) === phase &&
      !m.actualResult?.finalized &&
      !isMatchLocked(m, deadlines, tournament.kickoffLockMinutes),
  );

  const matchById = new Map(requiredMatches.map((m) => [m.id, m]));
  const predsByUser = new Map<string, Map<string, PredRow>>();
  for (const p of predictions) {
    if (!matchById.has(p.matchId)) continue;
    const byMatch = predsByUser.get(p.userId) ?? new Map();
    byMatch.set(p.matchId, p);
    predsByUser.set(p.userId, byMatch);
  }

  const total = requiredMatches.length;
  const rows = players.map((u) => {
    const byMatch = predsByUser.get(u.id);
    let filled = 0;
    for (const m of requiredMatches) {
      if (isMatchPredictionComplete(byMatch?.get(m.id), m)) filled++;
    }
    return {
      userId: u.id,
      name: u.name,
      filled,
      total,
      status: completionStatus(filled, total),
    };
  });

  return {
    phase,
    phaseLabel,
    lockAt: next.lockAt.toISOString(),
    kind: "matches",
    players: sortPlayers(rows),
  };
}
