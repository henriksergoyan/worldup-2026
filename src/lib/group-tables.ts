export interface GroupStandingRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  rank: number;
}

export interface GroupTable {
  groupCode: string;
  rows: GroupStandingRow[];
  complete: boolean;
}

export interface GroupMatchResult {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  finalized: boolean;
}

function compareRows(a: GroupStandingRow, b: GroupStandingRow): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return a.teamName.localeCompare(b.teamName);
}

/** Build FIFA-style group tables from finalized match results (3 matches per group). */
export function buildGroupTables(
  teams: { id: string; name: string; groupCode: string | null }[],
  matches: {
    groupCode: string | null;
    homeTeamId: string | null;
    awayTeamId: string | null;
    result: { normalHomeGoals: number | null; normalAwayGoals: number | null; finalized: boolean } | null;
  }[],
): Map<string, GroupTable> {
  const byGroup = new Map<string, GroupStandingRow[]>();

  for (const t of teams) {
    if (!t.groupCode) continue;
    const rows = byGroup.get(t.groupCode) ?? [];
    rows.push({
      teamId: t.id,
      teamName: t.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
      rank: 0,
    });
    byGroup.set(t.groupCode, rows);
  }

  for (const m of matches) {
    if (!m.groupCode || !m.homeTeamId || !m.awayTeamId || !m.result?.finalized) continue;
    const hg = m.result.normalHomeGoals;
    const ag = m.result.normalAwayGoals;
    if (hg === null || ag === null) continue;

    const rows = byGroup.get(m.groupCode);
    if (!rows) continue;
    const home = rows.find((r) => r.teamId === m.homeTeamId);
    const away = rows.find((r) => r.teamId === m.awayTeamId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.gf += hg;
    home.ga += ag;
    away.gf += ag;
    away.ga += hg;

    if (hg > ag) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (hg < ag) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  const tables = new Map<string, GroupTable>();
  for (const [groupCode, rows] of byGroup) {
    for (const r of rows) r.gd = r.gf - r.ga;
    const groupMatches = matches.filter((m) => m.groupCode === groupCode);

    rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;

      // FIFA Tiebreaker 4: Head-to-head points in the group matches between the teams concerned
      const h2hMatches = groupMatches.filter(
        (m) =>
          m.result?.finalized &&
          ((m.homeTeamId === a.teamId && m.awayTeamId === b.teamId) ||
            (m.homeTeamId === b.teamId && m.awayTeamId === a.teamId))
      );
      if (h2hMatches.length > 0) {
        const m = h2hMatches[0];
        const hg = m.result?.normalHomeGoals;
        const ag = m.result?.normalAwayGoals;
        if (hg !== null && ag !== null && hg !== undefined && ag !== undefined) {
          if (m.homeTeamId === a.teamId) {
            if (hg > ag) return -1;
            if (ag > hg) return 1;
          } else {
            if (ag > hg) return -1;
            if (hg > ag) return 1;
          }
        }
      }

      return a.teamName.localeCompare(b.teamName);
    });

    rows.forEach((r, i) => {
      r.rank = i + 1;
    });
    const finalizedCount = groupMatches.filter((m) => m.result?.finalized).length;
    tables.set(groupCode, {
      groupCode,
      rows,
      complete: finalizedCount >= 6,
    });
  }
  return tables;
}

export interface ThirdPlaceCandidate {
  groupCode: string;
  teamId: string;
  teamName: string;
  points: number;
  gd: number;
  gf: number;
}

/** Rank all third-place teams; return top 8 for knockout qualification. */
export function rankThirdPlaceTeams(tables: Map<string, GroupTable>): ThirdPlaceCandidate[] {
  const thirds: ThirdPlaceCandidate[] = [];
  for (const table of tables.values()) {
    if (!table.complete) continue;
    const third = table.rows.find((r) => r.rank === 3);
    if (!third) continue;
    thirds.push({
      groupCode: table.groupCode,
      teamId: third.teamId,
      teamName: third.teamName,
      points: third.points,
      gd: third.gd,
      gf: third.gf,
    });
  }
  thirds.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.groupCode.localeCompare(b.groupCode);
  });
  return thirds.slice(0, 8);
}

export interface AdvancingGroupSlot {
  groupCode: string;
  complete: boolean;
  first: GroupStandingRow | null;
  second: GroupStandingRow | null;
}

export interface AdvancingSelection {
  /** Group winners and runners-up, one entry per group (sorted by group code). */
  byGroup: AdvancingGroupSlot[];
  /** Best eight third-placed teams across complete groups. */
  bestThirds: ThirdPlaceCandidate[];
  /** Flat list of every team id that advances to the knockout stage. */
  teamIds: string[];
}

/**
 * Determine which teams advance to the knockout stage from a set of group
 * tables: the top two of every completed group plus the best eight third-placed
 * teams. Mirrors the qualifier logic used when filling the real bracket so that
 * a player's predicted standings and the actual standings are scored the same way.
 */
export function selectAdvancingTeams(tables: Map<string, GroupTable>): AdvancingSelection {
  const byGroup: AdvancingGroupSlot[] = [...tables.values()]
    .sort((a, b) => a.groupCode.localeCompare(b.groupCode))
    .map((t) => ({
      groupCode: t.groupCode,
      complete: t.complete,
      first: t.rows.find((r) => r.rank === 1) ?? null,
      second: t.rows.find((r) => r.rank === 2) ?? null,
    }));

  const bestThirds = rankThirdPlaceTeams(tables);

  const teamIds: string[] = [];
  for (const g of byGroup) {
    if (!g.complete) continue;
    if (g.first) teamIds.push(g.first.teamId);
    if (g.second) teamIds.push(g.second.teamId);
  }
  for (const t of bestThirds) teamIds.push(t.teamId);

  return { byGroup, bestThirds, teamIds };
}
