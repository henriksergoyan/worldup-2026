// Central place for tournament-wide constants and labels.
// Keep these aligned with the validated String fields in prisma/schema.prisma.

export const ROLES = {
  PLAYER: "PLAYER",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const STAGES = {
  GROUP: "GROUP",
  KNOCKOUT: "KNOCKOUT",
} as const;
export type Stage = (typeof STAGES)[keyof typeof STAGES];

// Knockout rounds, ordered from earliest to latest.
export const ROUNDS = ["R32", "R16", "QF", "SF", "3RD", "FINAL"] as const;
export type Round = (typeof ROUNDS)[number];

export const ROUND_LABELS: Record<Round, string> = {
  R32: "1/16 եզրափակիչ",
  R16: "1/8 եզրափակիչ",
  QF: "Քառորդ եզրափակիչ (1/4)",
  SF: "Կիսաեզրափակիչ (1/2)",
  "3RD": "3-րդ տեղի հանդիպում",
  FINAL: "Եզրափակիչ (Ֆինալ) 🏆",
};

export const MATCH_STATUS = {
  SCHEDULED: "SCHEDULED",
  LIVE: "LIVE",
  FINISHED: "FINISHED",
} as const;

export const TEAM_PICK_TYPES = {
  KNOCKOUT_QUALIFIER: "KNOCKOUT_QUALIFIER",
  CHAMPION: "CHAMPION",
} as const;

// Deadline phases. Players edit predictions for a phase until its lock time.
export const PHASES = {
  GROUP_R1_R2: "GROUP_R1_R2",
  GROUP_R3: "GROUP_R3",
  KO_R32: "KO_R32",
  KO_R16: "KO_R16",
  KO_QF: "KO_QF",
  KO_SF: "KO_SF",
  KO_3RD_FINAL: "KO_3RD_FINAL",
  CHAMPION: "CHAMPION",
  KNOCKOUT_TEAMS: "KNOCKOUT_TEAMS",
} as const;
export type Phase = (typeof PHASES)[keyof typeof PHASES];

export const PHASE_LABELS: Record<Phase, string> = {
  GROUP_R1_R2: "Խմբային փուլ — 1-ին և 2-րդ տուր",
  GROUP_R3: "Խմբային փուլ — 3-րդ տուր",
  KO_R32: "1/16 եզրափակիչ",
  KO_R16: "1/8 եզրափակիչ",
  KO_QF: "Քառորդ եզրափակիչներ",
  KO_SF: "Կիսաեզրափակիչներ",
  KO_3RD_FINAL: "3-րդ տեղ և Եզրափակիչ",
  CHAMPION: "Չեմպիոնի ընտրություն 🏆",
  KNOCKOUT_TEAMS: "Փլեյ-օֆֆի թիմերի ընտրություն",
};

export const PHASE_ORDER: Phase[] = [
  PHASES.CHAMPION,
  PHASES.GROUP_R1_R2,
  PHASES.GROUP_R3,
  PHASES.KO_R32,
  PHASES.KO_R16,
  PHASES.KO_QF,
  PHASES.KO_SF,
  PHASES.KO_3RD_FINAL,
];

/** Phases shown on the player deadline timeline (knockout-team picks have no lock). */
export const PLAYER_DEADLINE_PHASES: Phase[] = PHASE_ORDER;

// Map a knockout round to its deadline phase.
export const ROUND_TO_PHASE: Record<Round, Phase> = {
  R32: PHASES.KO_R32,
  R16: PHASES.KO_R16,
  QF: PHASES.KO_QF,
  SF: PHASES.KO_SF,
  "3RD": PHASES.KO_3RD_FINAL,
  FINAL: PHASES.KO_3RD_FINAL,
};

// Scoring point values (see ToR rules).
export const POINTS = {
  CORRECT_OUTCOME: 3,
  EXACT_SCORE: 5,
  COMPLICATED_EXACT: 6,
  ET_PEN_OUTCOME: 1,
  ET_PEN_EXACT: 2,
  QUALIFYING_WINNER: 1,
  TEAM_PICK: 2,
  CHAMPION: 8,
} as const;

// Default prize split by finishing rank (fractions of the prize pool).
export const DEFAULT_PRIZE_SPLIT: Record<string, number> = {
  "1": 0.4,
  "2": 0.2,
  "3": 0.15,
  "4": 0.1,
  "5": 0.07,
  "6": 0.05,
  "7": 0.03,
};

export const DEFAULT_ENTRY_FEE = 10000; // AMD
export const DEFAULT_KNOCKOUT_PICK_COUNT = 16;
/** League display timezone — all kickoffs and deadlines shown in this zone. */
export const DEFAULT_TIMEZONE = "Asia/Yerevan";
export const TIMEZONE_LABEL = "Երևանի ժամանակ";
export const TOURNAMENT_NAME = "FIFA World Cup 2026";
