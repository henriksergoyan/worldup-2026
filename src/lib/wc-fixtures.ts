// Official FIFA World Cup 2026 group-stage kickoffs (Eastern Time, EDT UTC-4).
// Source: FIFA / FOX Sports / fwclive.com schedule — converted to UTC for storage.
// Display uses Asia/Yerevan via formatDateTime (+8h from ET in June).

import { normalizeTeam } from "./wc-results";

/** Eastern Daylight Time offset from UTC during the tournament (June–July 2026). */
const ET_UTC_OFFSET_HOURS = 4;

export function etKickoffToUtc(month: number, day: number, hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, month - 1, day, hour + ET_UTC_OFFSET_HOURS, minute, 0));
}

function fixtureKey(home: string, away: string): string {
  return `${normalizeTeam(home)}|${normalizeTeam(away)}`;
}

/** [home, away, month, day, hourET, minuteET?] — all June 2026 unless noted. */
const KICKOFFS_ET: [string, string, number, number, number, number?][] = [
  // Matchday 1 — Jun 11–17
  ["Mexico", "South Africa", 6, 11, 15, 0],
  ["South Korea", "Czech Republic", 6, 11, 22, 0],
  ["Canada", "Bosnia and Herzegovina", 6, 12, 15, 0],
  ["United States", "Paraguay", 6, 12, 21, 0],
  ["Qatar", "Switzerland", 6, 13, 15, 0],
  ["Brazil", "Morocco", 6, 13, 18, 0],
  ["Haiti", "Scotland", 6, 13, 21, 0],
  ["Australia", "Turkey", 6, 14, 0, 0],
  ["Germany", "Curaçao", 6, 14, 13, 0],
  ["Netherlands", "Japan", 6, 14, 16, 0],
  ["Ivory Coast", "Ecuador", 6, 14, 19, 0],
  ["Sweden", "Tunisia", 6, 14, 22, 0],
  ["Spain", "Cape Verde", 6, 15, 12, 0],
  ["Belgium", "Egypt", 6, 15, 15, 0],
  ["Saudi Arabia", "Uruguay", 6, 15, 18, 0],
  ["Iran", "New Zealand", 6, 15, 21, 0],
  ["France", "Senegal", 6, 16, 15, 0],
  ["Iraq", "Norway", 6, 16, 18, 0],
  ["Argentina", "Algeria", 6, 16, 21, 0],
  ["Austria", "Jordan", 6, 17, 0, 0],
  ["Portugal", "DR Congo", 6, 17, 13, 0],
  ["England", "Croatia", 6, 17, 16, 0],
  ["Ghana", "Panama", 6, 17, 19, 0],
  ["Uzbekistan", "Colombia", 6, 17, 22, 0],
  // Matchday 2 — Jun 18–23
  ["Czech Republic", "South Africa", 6, 18, 12, 0],
  ["Switzerland", "Bosnia and Herzegovina", 6, 18, 15, 0],
  ["Canada", "Qatar", 6, 18, 18, 0],
  ["Mexico", "South Korea", 6, 18, 21, 0],
  ["United States", "Australia", 6, 19, 15, 0],
  ["Scotland", "Morocco", 6, 19, 18, 0],
  ["Brazil", "Haiti", 6, 19, 20, 30],
  ["Turkey", "Paraguay", 6, 19, 23, 0],
  ["Netherlands", "Sweden", 6, 20, 13, 0],
  ["Germany", "Ivory Coast", 6, 20, 16, 0],
  ["Ecuador", "Curaçao", 6, 20, 20, 0],
  ["Tunisia", "Japan", 6, 21, 0, 0],
  ["Spain", "Saudi Arabia", 6, 21, 12, 0],
  ["Belgium", "Iran", 6, 21, 15, 0],
  ["Uruguay", "Cape Verde", 6, 21, 18, 0],
  ["New Zealand", "Egypt", 6, 21, 21, 0],
  ["Argentina", "Austria", 6, 22, 13, 0],
  ["France", "Iraq", 6, 22, 17, 0],
  ["Norway", "Senegal", 6, 22, 20, 0],
  ["Jordan", "Algeria", 6, 22, 23, 0],
  ["Portugal", "Uzbekistan", 6, 23, 13, 0],
  ["England", "Ghana", 6, 23, 16, 0],
  ["Panama", "Croatia", 6, 23, 19, 0],
  ["Colombia", "DR Congo", 6, 23, 22, 0],
  // Matchday 3 — Jun 24–27
  ["Switzerland", "Canada", 6, 24, 15, 0],
  ["Bosnia and Herzegovina", "Qatar", 6, 24, 15, 0],
  ["Scotland", "Brazil", 6, 24, 18, 0],
  ["Morocco", "Haiti", 6, 24, 18, 0],
  ["Czech Republic", "Mexico", 6, 24, 21, 0],
  ["South Africa", "South Korea", 6, 24, 21, 0],
  ["Ecuador", "Germany", 6, 25, 16, 0],
  ["Curaçao", "Ivory Coast", 6, 25, 16, 0],
  ["Tunisia", "Netherlands", 6, 25, 19, 0],
  ["Japan", "Sweden", 6, 25, 19, 0],
  ["Turkey", "United States", 6, 25, 22, 0],
  ["Paraguay", "Australia", 6, 25, 22, 0],
  ["Norway", "France", 6, 26, 15, 0],
  ["Senegal", "Iraq", 6, 26, 15, 0],
  ["Cape Verde", "Saudi Arabia", 6, 26, 20, 0],
  ["Uruguay", "Spain", 6, 26, 20, 0],
  ["Egypt", "Iran", 6, 26, 23, 0],
  ["New Zealand", "Belgium", 6, 26, 23, 0],
  ["Panama", "England", 6, 27, 17, 0],
  ["Croatia", "Ghana", 6, 27, 17, 0],
  ["Algeria", "Austria", 6, 27, 22, 0],
  ["Jordan", "Argentina", 6, 27, 22, 0],
  ["Colombia", "Portugal", 6, 27, 19, 30],
  ["DR Congo", "Uzbekistan", 6, 27, 19, 30],
];

const KICKOFF_MAP = new Map<string, Date>();
for (const [home, away, month, day, hour, minute = 0] of KICKOFFS_ET) {
  const at = etKickoffToUtc(month, day, hour, minute);
  KICKOFF_MAP.set(fixtureKey(home, away), at);
}

/** Look up the official kickoff for a home/away pairing. */
export function lookupKickoff(homeTeam: string, awayTeam: string): Date | null {
  return KICKOFF_MAP.get(fixtureKey(homeTeam, awayTeam)) ?? null;
}

/** Replace workbook placeholder times with the official FIFA schedule. */
export function applyOfficialKickoffs<T extends { homeTeam: string; awayTeam: string; scheduledAt: Date }>(
  fixtures: T[],
): T[] {
  const missing: string[] = [];
  const updated = fixtures.map((f) => {
    const at = lookupKickoff(f.homeTeam, f.awayTeam);
    if (!at) {
      missing.push(`${f.homeTeam} vs ${f.awayTeam}`);
      return f;
    }
    return { ...f, scheduledAt: at };
  });
  if (missing.length > 0) {
    console.warn(`[wc-fixtures] No official kickoff for: ${missing.join(", ")}`);
  }
  return updated;
}
