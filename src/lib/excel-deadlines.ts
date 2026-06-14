import { PHASES, type Phase } from "./constants";

/** Asia/Yerevan is UTC+4. */
const YEREVAN_UTC_OFFSET = 4;

/** Build a UTC Date from a local Yerevan wall-clock time. Hour 24 = midnight next day. */
export function yerevanLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  let h = hour;
  let d = day;
  if (h >= 24) {
    h -= 24;
    d += 1;
  }
  return new Date(Date.UTC(year, month - 1, d, h - YEREVAN_UTC_OFFSET, minute, 0));
}

export interface ExcelDeadline {
  phase: Phase;
  lockAt: Date;
  /** Human label from the ToR spreadsheet. */
  label: string;
}

/**
 * Deadlines from ToR sheet (2026-WC-database-group-scores.xlsx, cell C5).
 * Knockout dates corrected from June → July per FIFA schedule (Excel typos).
 */
export const EXCEL_DEADLINES: ExcelDeadline[] = [
  {
    phase: PHASES.GROUP_R1_R2,
    lockAt: yerevanLocalToUtc(2026, 6, 9, 24, 0),
    label: "Group stage rounds 1 & 2 scores",
  },
  {
    phase: PHASES.CHAMPION,
    lockAt: yerevanLocalToUtc(2026, 6, 9, 24, 0),
    label: "Champion prediction",
  },
  {
    phase: PHASES.GROUP_R3,
    lockAt: yerevanLocalToUtc(2026, 6, 23, 0, 0),
    label: "Group stage round 3 scores",
  },
  {
    phase: PHASES.KO_R32,
    lockAt: yerevanLocalToUtc(2026, 6, 28, 24, 0),
    label: "Round of 32 (1/16)",
  },
  {
    phase: PHASES.KO_R16,
    lockAt: yerevanLocalToUtc(2026, 7, 4, 24, 0),
    label: "Round of 16 (1/8)",
  },
  {
    phase: PHASES.KO_QF,
    lockAt: yerevanLocalToUtc(2026, 7, 9, 24, 0),
    label: "Quarter-finals",
  },
  {
    phase: PHASES.KO_SF,
    lockAt: yerevanLocalToUtc(2026, 7, 13, 24, 0),
    label: "Semi-finals",
  },
  {
    phase: PHASES.KO_3RD_FINAL,
    lockAt: yerevanLocalToUtc(2026, 7, 18, 18, 0),
    label: "Third-place match & Final",
  },
];

/** Fee payment reminder (not a lock phase in the app). */
export const EXCEL_FEE_DEADLINE = yerevanLocalToUtc(2026, 6, 9, 20, 0);
