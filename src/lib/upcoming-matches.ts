import { type Phase } from "./constants";
import { isMatchLocked, type DeadlineState } from "./deadlines";

export type UpcomingMatchInput = {
  stage: string;
  round: string | null;
  matchNumber: number;
  scheduledAt: Date;
  actualResult?: { finalized: boolean } | null;
};

/** Kickoff has not passed and the match is not finalized. */
export function isMatchUpcoming(
  match: UpcomingMatchInput,
  now = Date.now(),
): boolean {
  if (match.actualResult?.finalized) return false;
  return match.scheduledAt.getTime() > now;
}

/**
 * Pick the next N upcoming fixtures for the player dashboard.
 * Prefers matches that are still open for predictions (not locked),
 * then fills with the nearest locked kickoffs if needed.
 */
export function pickUpcomingMatches<T extends UpcomingMatchInput>(
  matches: T[],
  deadlines: Map<Phase, DeadlineState>,
  kickoffLockMinutes: number,
  limit = 3,
  now = Date.now(),
): T[] {
  const future = matches
    .filter((m) => isMatchUpcoming(m, now))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const open: T[] = [];
  const locked: T[] = [];
  for (const m of future) {
    if (isMatchLocked(m, deadlines, kickoffLockMinutes)) {
      locked.push(m);
    } else {
      open.push(m);
    }
  }

  return [...open, ...locked].slice(0, limit);
}
