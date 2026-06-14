// Official FIFA World Cup 2026 knockout bracket (matches 73–104).
// Seed labels use FIFA notation; admin assigns real teams as groups finish.

export interface KnockoutFixtureDef {
  matchNumber: number;
  round: "R32" | "R16" | "QF" | "SF" | "3RD" | "FINAL";
  homeSeedLabel: string;
  awaySeedLabel: string;
  /** Local kickoff date YYYY-MM-DD (US host cities, local time). */
  date: string;
  /** Local kickoff time HH:MM */
  time: string;
}

/** US local times from FIFA schedule; stored as UTC via Eastern offset approximation. */
function koDate(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  // Host venues span US/Mexico time zones; use UTC-5 (US Eastern) as bracket default.
  return new Date(Date.UTC(y, m - 1, d, hh + 5, mm, 0));
}

const R32: Omit<KnockoutFixtureDef, "round">[] = [
  { matchNumber: 73, homeSeedLabel: "2A", awaySeedLabel: "2B", date: "2026-06-28", time: "12:00" },
  { matchNumber: 74, homeSeedLabel: "1E", awaySeedLabel: "3ABCDF", date: "2026-06-29", time: "16:30" },
  { matchNumber: 75, homeSeedLabel: "1F", awaySeedLabel: "2C", date: "2026-06-29", time: "19:00" },
  { matchNumber: 76, homeSeedLabel: "1C", awaySeedLabel: "2F", date: "2026-06-29", time: "12:00" },
  { matchNumber: 77, homeSeedLabel: "1I", awaySeedLabel: "3CDFGH", date: "2026-06-30", time: "17:00" },
  { matchNumber: 78, homeSeedLabel: "2E", awaySeedLabel: "2I", date: "2026-06-30", time: "12:00" },
  { matchNumber: 79, homeSeedLabel: "1A", awaySeedLabel: "3CEFHI", date: "2026-06-30", time: "19:00" },
  { matchNumber: 80, homeSeedLabel: "1L", awaySeedLabel: "3EHIJK", date: "2026-07-01", time: "12:00" },
  { matchNumber: 81, homeSeedLabel: "1D", awaySeedLabel: "3BEFIJ", date: "2026-07-01", time: "17:00" },
  { matchNumber: 82, homeSeedLabel: "1G", awaySeedLabel: "3AEHIJ", date: "2026-07-01", time: "13:00" },
  { matchNumber: 83, homeSeedLabel: "2K", awaySeedLabel: "2L", date: "2026-07-02", time: "19:00" },
  { matchNumber: 84, homeSeedLabel: "1H", awaySeedLabel: "2J", date: "2026-07-02", time: "12:00" },
  { matchNumber: 85, homeSeedLabel: "1B", awaySeedLabel: "3EFGIJ", date: "2026-07-02", time: "20:00" },
  { matchNumber: 86, homeSeedLabel: "1J", awaySeedLabel: "2H", date: "2026-07-03", time: "18:00" },
  { matchNumber: 87, homeSeedLabel: "1K", awaySeedLabel: "3DEIJL", date: "2026-07-03", time: "20:30" },
  { matchNumber: 88, homeSeedLabel: "2D", awaySeedLabel: "2G", date: "2026-07-03", time: "12:00" },
];

const R16: Omit<KnockoutFixtureDef, "round">[] = [
  { matchNumber: 89, homeSeedLabel: "W74", awaySeedLabel: "W77", date: "2026-07-04", time: "16:30" },
  { matchNumber: 90, homeSeedLabel: "W73", awaySeedLabel: "W75", date: "2026-07-04", time: "12:00" },
  { matchNumber: 91, homeSeedLabel: "W76", awaySeedLabel: "W78", date: "2026-07-05", time: "12:00" },
  { matchNumber: 92, homeSeedLabel: "W79", awaySeedLabel: "W80", date: "2026-07-05", time: "19:00" },
  { matchNumber: 93, homeSeedLabel: "W83", awaySeedLabel: "W84", date: "2026-07-06", time: "12:00" },
  { matchNumber: 94, homeSeedLabel: "W81", awaySeedLabel: "W82", date: "2026-07-06", time: "16:00" },
  { matchNumber: 95, homeSeedLabel: "W86", awaySeedLabel: "W88", date: "2026-07-07", time: "12:00" },
  { matchNumber: 96, homeSeedLabel: "W85", awaySeedLabel: "W87", date: "2026-07-07", time: "16:00" },
];

const QF: Omit<KnockoutFixtureDef, "round">[] = [
  { matchNumber: 97, homeSeedLabel: "W89", awaySeedLabel: "W90", date: "2026-07-09", time: "12:00" },
  { matchNumber: 98, homeSeedLabel: "W93", awaySeedLabel: "W94", date: "2026-07-10", time: "12:00" },
  { matchNumber: 99, homeSeedLabel: "W91", awaySeedLabel: "W92", date: "2026-07-11", time: "12:00" },
  { matchNumber: 100, homeSeedLabel: "W95", awaySeedLabel: "W96", date: "2026-07-11", time: "16:00" },
];

const SF: Omit<KnockoutFixtureDef, "round">[] = [
  { matchNumber: 101, homeSeedLabel: "W97", awaySeedLabel: "W98", date: "2026-07-14", time: "12:00" },
  { matchNumber: 102, homeSeedLabel: "W99", awaySeedLabel: "W100", date: "2026-07-15", time: "12:00" },
];

const LATE: Omit<KnockoutFixtureDef, "round">[] = [
  { matchNumber: 103, homeSeedLabel: "L101", awaySeedLabel: "L102", date: "2026-07-18", time: "12:00" },
  { matchNumber: 104, homeSeedLabel: "W101", awaySeedLabel: "W102", date: "2026-07-19", time: "12:00" },
];

function withRound(
  items: Omit<KnockoutFixtureDef, "round">[],
  round: KnockoutFixtureDef["round"],
): KnockoutFixtureDef[] {
  return items.map((m) => ({ ...m, round }));
}

export const KNOCKOUT_FIXTURES: KnockoutFixtureDef[] = [
  ...withRound(R32, "R32"),
  ...withRound(R16, "R16"),
  ...withRound(QF, "QF"),
  ...withRound(SF, "SF"),
  { ...LATE[0], round: "3RD" },
  { ...LATE[1], round: "FINAL" },
];

export function knockoutScheduledAt(def: KnockoutFixtureDef): Date {
  return koDate(def.date, def.time);
}
