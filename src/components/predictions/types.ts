export interface MatchDTO {
  id: string;
  matchNumber: number;
  stage: string;
  round: string | null;
  groupCode: string | null;
  scheduledAt: string;
  homeName: string | null;
  awayName: string | null;
  homeSeedLabel: string | null;
  awaySeedLabel: string | null;
  locked: boolean;
  phase: string;
  pred: {
    normalHome: number | null;
    normalAway: number | null;
    extraHome: number | null;
    extraAway: number | null;
    penaltyHome: number | null;
    penaltyAway: number | null;
    winner: "HOME" | "AWAY" | null;
  } | null;
  actual: { normalHome: number | null; normalAway: number | null } | null;
  points: number | null;
  averagePoints?: number | null;
  /** Others' predictions are visible (reveal window passed). */
  revealed: boolean;
}

export interface GroupStandingRowDTO {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gd: number;
  points: number;
  rank: number;
}

export interface TeamDTO {
  id: string;
  name: string;
  groupCode: string | null;
}

export interface LockInfo {
  locked: boolean;
  lockAt: string | null;
}
