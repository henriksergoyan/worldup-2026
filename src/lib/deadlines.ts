import { prisma } from "./prisma";
import { PHASES, ROUND_TO_PHASE, STAGES, type Phase, type Round } from "./constants";

export interface DeadlineState {
  phase: Phase;
  lockAt: Date | null;
  isOpen: boolean;
  locked: boolean;
}

export const DEFAULT_KICKOFF_LOCK_MINUTES = 0;

/** A phase is locked once its lock time has passed. */
export function isPhaseLocked(deadline: { lockAt: Date | null } | null | undefined): boolean {
  if (!deadline?.lockAt) return false;
  return Date.now() >= deadline.lockAt.getTime();
}

/** @deprecated alias */
export const isLocked = isPhaseLocked;

/** Map a match to the deadline phase that governs champion/team picks context. */
export function phaseForMatch(match: {
  stage: string;
  round: string | null;
  matchNumber: number;
}): Phase {
  if (match.stage === STAGES.KNOCKOUT && match.round) {
    return ROUND_TO_PHASE[match.round as Round] ?? PHASES.KO_R32;
  }
  const indexInGroup = (match.matchNumber - 1) % 6;
  return indexInGroup < 4 ? PHASES.GROUP_R1_R2 : PHASES.GROUP_R3;
}

export function isGroupRound3Match(match: {
  stage: string;
  round: string | null;
  matchNumber: number;
}): boolean {
  return match.stage === STAGES.GROUP && phaseForMatch(match) === PHASES.GROUP_R3;
}

type MatchScheduleRow = {
  stage: string;
  round: string | null;
  matchNumber: number;
  scheduledAt: Date;
};

/** Earliest kickoff among group-stage round 3 fixtures. */
export function groupR3FirstKickoff(matches: MatchScheduleRow[]): Date | null {
  const r3 = matches.filter(isGroupRound3Match);
  if (r3.length === 0) return null;
  return r3.reduce(
    (min, m) => (m.scheduledAt.getTime() < min.getTime() ? m.scheduledAt : min),
    r3[0].scheduledAt,
  );
}

/** GROUP_R3 automatic floor: first round-3 kickoff minus the kickoff lock window. */
export function groupR3PhaseLockAt(
  matches: MatchScheduleRow[],
  kickoffLockMinutes: number = DEFAULT_KICKOFF_LOCK_MINUTES,
): Date | null {
  const first = groupR3FirstKickoff(matches);
  if (!first) return null;
  return matchEditLockAt(first, kickoffLockMinutes);
}

/**
 * Merge admin GROUP_R3 settings with the automatic first-kickoff lock.
 * Admin may extend the deadline; it never shortens below kickoff − lock window.
 */
export function resolveGroupR3Deadline(
  adminDeadline: { lockAt: Date | null } | undefined,
  matches: MatchScheduleRow[],
  kickoffLockMinutes: number = DEFAULT_KICKOFF_LOCK_MINUTES,
): DeadlineState | null {
  const kickoffLockAt = groupR3PhaseLockAt(matches, kickoffLockMinutes);
  if (!kickoffLockAt) return null;

  const lockAt =
    adminDeadline?.lockAt != null
      ? new Date(Math.max(adminDeadline.lockAt.getTime(), kickoffLockAt.getTime()))
      : kickoffLockAt;

  return {
    phase: PHASES.GROUP_R3,
    lockAt,
    isOpen: true,
    locked: isPhaseLocked({ lockAt }),
  };
}

export async function getDeadlineMap(tournamentId: string): Promise<Map<Phase, DeadlineState>> {
  const [rows, tournament, matches] = await Promise.all([
    prisma.deadline.findMany({ where: { tournamentId } }),
    prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      select: { kickoffLockMinutes: true },
    }),
    prisma.match.findMany({
      where: { tournamentId },
      select: { stage: true, round: true, matchNumber: true, scheduledAt: true },
    }),
  ]);

  const map = new Map<Phase, DeadlineState>();
  for (const r of rows) {
    map.set(r.phase as Phase, {
      phase: r.phase as Phase,
      lockAt: r.lockAt,
      isOpen: r.isOpen,
      locked: isPhaseLocked(r),
    });
  }

  const r3Deadline = resolveGroupR3Deadline(
    map.get(PHASES.GROUP_R3),
    matches,
    tournament.kickoffLockMinutes,
  );
  if (r3Deadline) {
    map.set(PHASES.GROUP_R3, r3Deadline);
  }

  return map;
}

/** Kickoff minus lock window — when players can no longer edit this match. */
export function matchEditLockAt(scheduledAt: Date, kickoffLockMinutes: number): Date {
  return new Date(scheduledAt.getTime() - kickoffLockMinutes * 60 * 1000);
}

/**
 * Match predictions lock at kickoff minus the configured window (default: 0 = at kickoff).
 * Champion/team picks still use phase deadlines (checked separately).
 */
export function isMatchPredictionLocked(
  match: { scheduledAt: Date },
  kickoffLockMinutes: number = DEFAULT_KICKOFF_LOCK_MINUTES,
): boolean {
  return Date.now() >= matchEditLockAt(match.scheduledAt, kickoffLockMinutes).getTime();
}

/** Combined lock: kickoff window OR legacy phase lock (whichever locks first). */
export function isMatchLocked(
  match: { stage: string; round: string | null; matchNumber: number; scheduledAt: Date },
  deadlines: Map<Phase, DeadlineState>,
  kickoffLockMinutes: number = DEFAULT_KICKOFF_LOCK_MINUTES,
): boolean {
  if (isMatchPredictionLocked(match, kickoffLockMinutes)) return true;
  const phase = phaseForMatch(match);
  return deadlines.get(phase)?.locked ?? false;
}

/** When others' predictions become visible (phase deadline or kickoff lock, whichever is earlier). */
export function predictionsRevealAt(
  match: { stage: string; round: string | null; matchNumber: number; scheduledAt: Date },
  deadlines: Map<Phase, DeadlineState>,
  kickoffLockMinutes: number = DEFAULT_KICKOFF_LOCK_MINUTES,
): Date {
  const kickoffLock = matchEditLockAt(match.scheduledAt, kickoffLockMinutes);
  const phaseDeadline = deadlines.get(phaseForMatch(match));
  if (!phaseDeadline?.lockAt) return kickoffLock;
  return new Date(Math.min(phaseDeadline.lockAt.getTime(), kickoffLock.getTime()));
}

/**
 * Others' predictions become visible once the phase deadline passes or match editing
 * locks (kickoff minus lock window), whichever comes first. Admins always see all.
 */
export function canRevealPredictions(
  match: { stage: string; round: string | null; matchNumber: number; scheduledAt: Date },
  options: {
    isAdmin: boolean;
    kickoffLockMinutes?: number;
    deadlines: Map<Phase, DeadlineState>;
  },
): boolean {
  if (options.isAdmin) return true;
  const kickoffLockMinutes = options.kickoffLockMinutes ?? DEFAULT_KICKOFF_LOCK_MINUTES;
  if (isMatchPredictionLocked(match, kickoffLockMinutes)) return true;
  const phase = phaseForMatch(match);
  return isPhaseLocked(options.deadlines.get(phase));
}

export function upcomingDeadlines(
  deadlines: Map<Phase, DeadlineState>,
  limit = 5,
): DeadlineState[] {
  const now = Date.now();
  return [...deadlines.values()]
    .filter((d) => d.lockAt && d.lockAt.getTime() > now)
    .sort((a, b) => a.lockAt!.getTime() - b.lockAt!.getTime())
    .slice(0, limit);
}

export function nextDeadline(deadlines: Map<Phase, DeadlineState>): DeadlineState | null {
  const upcoming = [...deadlines.values()]
    .filter((d) => !d.locked && d.lockAt && d.lockAt.getTime() > Date.now())
    .sort((a, b) => a.lockAt!.getTime() - b.lockAt!.getTime());
  return upcoming[0] ?? null;
}

/** Next match edit lock across all upcoming fixtures. */
export function nextMatchLock(
  matches: { scheduledAt: Date }[],
  kickoffLockMinutes: number,
): Date | null {
  const now = Date.now();
  const upcoming = matches
    .map((m) => matchEditLockAt(m.scheduledAt, kickoffLockMinutes))
    .filter((d) => d.getTime() > now)
    .sort((a, b) => a.getTime() - b.getTime());
  return upcoming[0] ?? null;
}
