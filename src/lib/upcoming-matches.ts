import { type Phase } from "./constants";
import type { DeadlineState } from "./deadlines";

export type UpcomingMatchInput = {
  stage: string;
  round: string | null;
  matchNumber: number;
  scheduledAt: Date;
  actualResult?: { finalized: boolean } | null;
};

/** How long after kickoff a match stays on the player's upcoming list. */
export const UPCOMING_MATCH_VISIBLE_AFTER_KICKOFF_MS = 2 * 60 * 60 * 1000;

/** Kickoff has not passed and the match is not finalized. */
export function isMatchUpcoming(
  match: UpcomingMatchInput,
  now = Date.now(),
): boolean {
  if (match.actualResult?.finalized) return false;
  return match.scheduledAt.getTime() > now;
}

/** In progress: kickoff passed, not finalized, still within the post-kickoff visibility window. */
export function isMatchLive(
  match: UpcomingMatchInput,
  now = Date.now(),
): boolean {
  if (match.actualResult?.finalized) return false;
  const kickoff = match.scheduledAt.getTime();
  return kickoff <= now && now < kickoff + UPCOMING_MATCH_VISIBLE_AFTER_KICKOFF_MS;
}

/** Shown on dashboard until finalized or 2 hours after kickoff. */
export function isMatchVisibleInUpcomingList(
  match: UpcomingMatchInput,
  now = Date.now(),
): boolean {
  if (match.actualResult?.finalized) return false;
  return now < match.scheduledAt.getTime() + UPCOMING_MATCH_VISIBLE_AFTER_KICKOFF_MS;
}

/**
 * Pick the next N fixtures for the player dashboard.
 * Live games first, then everything else in kickoff order (lock status does not reorder).
 */
export function pickUpcomingMatches<T extends UpcomingMatchInput>(
  matches: T[],
  _deadlines: Map<Phase, DeadlineState>,
  _kickoffLockMinutes: number,
  limit = 3,
  now = Date.now(),
): T[] {
  const visible = matches
    .filter((m) => isMatchVisibleInUpcomingList(m, now))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const live = visible.filter((m) => isMatchLive(m, now));
  const rest = visible.filter((m) => !isMatchLive(m, now));

  return [...live, ...rest].slice(0, limit);
}
