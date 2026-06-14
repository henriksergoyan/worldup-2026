// Actual World Cup 2026 group-stage results (as of June 14, 2026).
// Sources: FIFA.com, ESPN, FootballTransfers — opening matchday Jun 11–13.
// Keyed by normalized home|away team names from our seed data.

export interface ActualScore {
  home: number;
  away: number;
  finalized?: boolean;
}

/** Normalize team aliases to our database names. */
export function normalizeTeam(name: string): string {
  const map: Record<string, string> = {
    "korea republic": "South Korea",
    "south korea": "South Korea",
    czechia: "Czech Republic",
    "czech republic": "Czech Republic",
    usa: "United States",
    "united states": "United States",
    turkiye: "Turkey",
    turkey: "Turkey",
    "côte d'ivoire": "Ivory Coast",
    "ivory coast": "Ivory Coast",
    curacao: "Curaçao",
    "curaçao": "Curaçao",
    "bosnia & herzegovina": "Bosnia and Herzegovina",
    "bosnia and herzegovina": "Bosnia and Herzegovina",
  };
  const key = name.trim().toLowerCase();
  return map[key] ?? name.trim();
}

function key(home: string, away: string): string {
  return `${normalizeTeam(home)}|${normalizeTeam(away)}`;
}

/** Played fixtures through June 13, 2026. */
export const WC_2026_RESULTS: Record<string, ActualScore> = {
  [key("Mexico", "South Africa")]: { home: 2, away: 0, finalized: true },
  [key("South Korea", "Czech Republic")]: { home: 2, away: 1, finalized: true },
  [key("South Korea", "Czechia")]: { home: 2, away: 1, finalized: true },
  [key("Canada", "Bosnia and Herzegovina")]: { home: 1, away: 1, finalized: true },
  [key("United States", "Paraguay")]: { home: 4, away: 1, finalized: true },
  [key("USA", "Paraguay")]: { home: 4, away: 1, finalized: true },
  [key("Qatar", "Switzerland")]: { home: 1, away: 1, finalized: true },
  [key("Brazil", "Morocco")]: { home: 1, away: 1, finalized: true },
  [key("Haiti", "Scotland")]: { home: 0, away: 1, finalized: true },
  [key("Australia", "Turkey")]: { home: 2, away: 0, finalized: true },
  [key("Australia", "Türkiye")]: { home: 2, away: 0, finalized: true },
};

export function lookupResult(homeTeam: string, awayTeam: string): ActualScore | null {
  return WC_2026_RESULTS[key(homeTeam, awayTeam)] ?? null;
}
