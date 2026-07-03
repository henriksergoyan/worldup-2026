import {
  buildGroupTables,
  selectAdvancingTeams,
  type AdvancingSelection,
} from "./group-tables";

export interface TeamMeta {
  id: string;
  name: string;
  groupCode: string | null;
}

export interface GroupMatchMeta {
  groupCode: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
}

/** A single group-stage prediction reduced to its normal-time score. */
export interface PredictedScore {
  home: number | null;
  away: number | null;
}

/**
 * Derive the teams a player's predicted group-stage results would send to the
 * knockout stage. Each fully-predicted group yields its top two teams, and the
 * best eight predicted third-placed teams round out the 32 qualifiers.
 */
export function buildPredictedAdvancing(
  teams: TeamMeta[],
  groupMatches: GroupMatchMeta[],
  predictionByMatchIndex: (i: number) => PredictedScore | null,
): AdvancingSelection {
  const tables = buildGroupTables(
    teams.map((t) => ({ id: t.id, name: t.name, groupCode: t.groupCode })),
    groupMatches.map((m, i) => {
      const pred = predictionByMatchIndex(i);
      return {
        groupCode: m.groupCode,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        result:
          pred && pred.home !== null && pred.away !== null
            ? { normalHomeGoals: pred.home, normalAwayGoals: pred.away, finalized: true }
            : null,
      };
    }),
  );
  return selectAdvancingTeams(tables);
}

export interface QualifierTeamView {
  teamId: string;
  name: string | null;
  groupCode: string | null;
  rank: number | null;
  /** Whether this predicted team actually reached the knockout stage. */
  hit: boolean;
}

export interface QualifiersViz {
  /** +2 per correctly predicted advancing team. */
  points: number;
  /** Whether the real qualifiers are known yet (group stage finished). */
  actualKnown: boolean;
  groups: {
    groupCode: string;
    complete: boolean;
    teams: QualifierTeamView[];
  }[];
  bestThirds: QualifierTeamView[];
}

/**
 * Project an {@link AdvancingSelection} plus the actual qualifier set into the
 * view-model consumed by the UI, tagging each predicted team with whether it
 * actually advanced and totalling the +2 bonus.
 */
export function buildQualifiersViz(
  selection: AdvancingSelection,
  actualQualifiedTeamIds: string[],
  pointPerHit: number,
): QualifiersViz {
  const qualified = new Set(actualQualifiedTeamIds);
  const actualKnown = qualified.size > 0;
  let hits = 0;

  const tag = (
    teamId: string,
    name: string | null,
    groupCode: string | null,
    rank: number | null,
  ): QualifierTeamView => {
    const hit = qualified.has(teamId);
    if (hit) hits += 1;
    return { teamId, name, groupCode, rank, hit };
  };

  const groups = selection.byGroup.map((g) => ({
    groupCode: g.groupCode,
    complete: g.complete,
    teams: [g.first, g.second]
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .map((r) => tag(r.teamId, r.teamName, g.groupCode, r.rank)),
  }));

  const bestThirds = selection.bestThirds.map((t) =>
    tag(t.teamId, t.teamName, t.groupCode, 3),
  );

  return { points: hits * pointPerHit, actualKnown, groups, bestThirds };
}

/** Mean qualifier (+2) points across all players when actual qualifiers are known. */
export function averageQualifierPoints(
  breakdownByUser: Record<string, { knockoutTeamPoints: number } | undefined>,
  actualKnown: boolean,
): number | null {
  if (!actualKnown) return null;
  const users = Object.keys(breakdownByUser);
  if (users.length === 0) return null;
  const sum = users.reduce((s, id) => s + (breakdownByUser[id]?.knockoutTeamPoints ?? 0), 0);
  return Number((sum / users.length).toFixed(2));
}
