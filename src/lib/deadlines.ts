import { prisma } from "./prisma";
import { PHASES, ROUND_TO_PHASE, STAGES, type Phase, type Round } from "./constants";

export interface DeadlineState {
  phase: Phase;
  lockAt: Date | null;
  isOpen: boolean;
  locked: boolean;
}

export const DEFAULT_KICKOFF_LOCK_MINUTES = 60;

/** A phase is locked for players when it's closed or its lock time has passed. */
export function isPhaseLocked(deadline: { lockAt: Date | null; isOpen: boolean } | null | undefined): boolean {
  if (!deadline) return false;
  if (!deadline.isOpen) return true;
  if (deadline.lockAt && Date.now() >= deadline.lockAt.getTime()) return true;
  return false;
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

export async function getDeadlineMap(tournamentId: string): Promise<Map<Phase, DeadlineState>> {
  const rows = await prisma.deadline.findMany({ where: { tournamentId } });
  const map = new Map<Phase, DeadlineState>();
  for (const r of rows) {
    map.set(r.phase as Phase, {
      phase: r.phase as Phase,
      lockAt: r.lockAt,
      isOpen: r.isOpen,
      locked: isPhaseLocked(r),
    });
  }
  return map;
}

/** Kickoff minus lock window — when players can no longer edit this match. */
export function matchEditLockAt(scheduledAt: Date, kickoffLockMinutes: number): Date {
  return new Date(scheduledAt.getTime() - kickoffLockMinutes * 60 * 1000);
}

/**
 * Match predictions lock 1 hour (configurable) before kickoff.
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

/**
 * Others' predictions become visible once editing locks (1hr before kickoff),
 * after kickoff, or when admin views. Aggregate teasers can show earlier.
 */
export function canRevealPredictions(
  match: { scheduledAt: Date },
  options: { isAdmin: boolean; kickoffLockMinutes?: number },
): boolean {
  if (options.isAdmin) return true;
  return isMatchPredictionLocked(match, options.kickoffLockMinutes ?? DEFAULT_KICKOFF_LOCK_MINUTES);
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
