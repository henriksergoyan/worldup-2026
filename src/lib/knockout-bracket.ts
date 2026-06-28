// Official FIFA World Cup 2026 knockout bracket (matches 73–104).
// Kickoffs: FIFA schedule, Eastern Daylight Time (EDT UTC−4).
// Source: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums

import { etKickoffToUtc } from "./wc-fixtures";

export interface KnockoutFixtureDef {
  matchNumber: number;
  round: "R32" | "R16" | "QF" | "SF" | "3RD" | "FINAL";
  homeSeedLabel: string;
  awaySeedLabel: string;
  /** Local kickoff date YYYY-MM-DD (EDT). */
  date: string;
  /** Local kickoff time HH:MM (EDT). */
  time: string;
}

const KNOCKOUT_BY_MATCH = new Map<number, KnockoutFixtureDef>();

function koKickoff(date: string, time: string): Date {
  const [, month, day] = date.split("-").map(Number);
  const [hour, minute = 0] = time.split(":").map(Number);
  return etKickoffToUtc(month, day, hour, minute);
}

function ko(
  matchNumber: number,
  round: KnockoutFixtureDef["round"],
  homeSeedLabel: string,
  awaySeedLabel: string,
  date: string,
  time: string,
): KnockoutFixtureDef {
  const def = { matchNumber, round, homeSeedLabel, awaySeedLabel, date, time };
  KNOCKOUT_BY_MATCH.set(matchNumber, def);
  return def;
}

const R32: KnockoutFixtureDef[] = [
  ko(73, "R32", "2A", "2B", "2026-06-28", "15:00"),
  ko(74, "R32", "1E", "3ABCDF", "2026-06-29", "16:00"),
  ko(75, "R32", "1F", "2C", "2026-06-29", "21:00"),
  ko(76, "R32", "1C", "2F", "2026-06-29", "13:00"),
  ko(77, "R32", "1I", "3CDFGH", "2026-06-30", "17:00"),
  ko(78, "R32", "2E", "2I", "2026-06-30", "13:00"),
  ko(79, "R32", "1A", "3CEFHI", "2026-06-30", "21:00"),
  ko(80, "R32", "1L", "3EHIJK", "2026-07-01", "12:00"),
  ko(81, "R32", "1D", "3BEFIJ", "2026-07-01", "20:00"),
  ko(82, "R32", "1G", "3AEHIJ", "2026-07-01", "16:00"),
  ko(83, "R32", "2K", "2L", "2026-07-02", "19:00"),
  ko(84, "R32", "1H", "2J", "2026-07-02", "15:00"),
  ko(85, "R32", "1B", "3EFGIJ", "2026-07-02", "21:00"),
  ko(86, "R32", "1J", "2H", "2026-07-03", "18:00"),
  ko(87, "R32", "1K", "3DEIJL", "2026-07-03", "21:30"),
  ko(88, "R32", "2D", "2G", "2026-07-03", "14:00"),
];

const R16: KnockoutFixtureDef[] = [
  ko(89, "R16", "W74", "W77", "2026-07-04", "17:00"),
  ko(90, "R16", "W73", "W75", "2026-07-04", "13:00"),
  ko(91, "R16", "W76", "W78", "2026-07-05", "16:00"),
  ko(92, "R16", "W79", "W80", "2026-07-05", "20:00"),
  ko(93, "R16", "W83", "W84", "2026-07-06", "15:00"),
  ko(94, "R16", "W81", "W82", "2026-07-06", "20:00"),
  ko(95, "R16", "W86", "W88", "2026-07-06", "12:00"),
  ko(96, "R16", "W85", "W87", "2026-07-07", "16:00"),
];

const QF: KnockoutFixtureDef[] = [
  ko(97, "QF", "W89", "W90", "2026-07-09", "16:00"),
  ko(98, "QF", "W93", "W94", "2026-07-10", "15:00"),
  ko(99, "QF", "W91", "W92", "2026-07-11", "17:00"),
  ko(100, "QF", "W95", "W96", "2026-07-11", "21:00"),
];

const SF: KnockoutFixtureDef[] = [
  ko(101, "SF", "W97", "W98", "2026-07-14", "15:00"),
  ko(102, "SF", "W99", "W100", "2026-07-15", "15:00"),
];

const LATE: KnockoutFixtureDef[] = [
  ko(103, "3RD", "L101", "L102", "2026-07-18", "17:00"),
  ko(104, "FINAL", "W101", "W102", "2026-07-19", "15:00"),
];

export const KNOCKOUT_FIXTURES: KnockoutFixtureDef[] = [
  ...R32,
  ...R16,
  ...QF,
  ...SF,
  ...LATE,
];

export function knockoutScheduledAt(def: KnockoutFixtureDef): Date {
  return koKickoff(def.date, def.time);
}

export function lookupKnockoutKickoff(matchNumber: number): Date | null {
  const def = KNOCKOUT_BY_MATCH.get(matchNumber);
  return def ? knockoutScheduledAt(def) : null;
}
