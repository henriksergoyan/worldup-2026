import fs from "node:fs";
import path from "node:path";
import { prisma } from "./prisma";
import { buildGroupTables, rankThirdPlaceTeams, selectAdvancingTeams } from "./group-tables";
import { MATCH_STATUS, STAGES } from "./constants";
import { lookupResult } from "./wc-results";

type SlotSource =
  | { kind: "position"; group: string; position: 1 | 2 }
  | { kind: "annex_c"; groupWinner: string };

/** FIFA-official R32 slot sources (matches 73–88). */
const R32_SLOTS: Record<number, { home: SlotSource; away: SlotSource }> = {
  73: { home: { kind: "position", group: "A", position: 2 }, away: { kind: "position", group: "B", position: 2 } },
  74: { home: { kind: "position", group: "E", position: 1 }, away: { kind: "annex_c", groupWinner: "E" } },
  75: { home: { kind: "position", group: "F", position: 1 }, away: { kind: "position", group: "C", position: 2 } },
  76: { home: { kind: "position", group: "C", position: 1 }, away: { kind: "position", group: "F", position: 2 } },
  77: { home: { kind: "position", group: "I", position: 1 }, away: { kind: "annex_c", groupWinner: "I" } },
  78: { home: { kind: "position", group: "E", position: 2 }, away: { kind: "position", group: "I", position: 2 } },
  79: { home: { kind: "position", group: "A", position: 1 }, away: { kind: "annex_c", groupWinner: "A" } },
  80: { home: { kind: "position", group: "L", position: 1 }, away: { kind: "annex_c", groupWinner: "L" } },
  81: { home: { kind: "position", group: "D", position: 1 }, away: { kind: "annex_c", groupWinner: "D" } },
  82: { home: { kind: "position", group: "G", position: 1 }, away: { kind: "annex_c", groupWinner: "G" } },
  83: { home: { kind: "position", group: "K", position: 2 }, away: { kind: "position", group: "L", position: 2 } },
  84: { home: { kind: "position", group: "H", position: 1 }, away: { kind: "position", group: "J", position: 2 } },
  85: { home: { kind: "position", group: "B", position: 1 }, away: { kind: "annex_c", groupWinner: "B" } },
  86: { home: { kind: "position", group: "J", position: 1 }, away: { kind: "position", group: "H", position: 2 } },
  87: { home: { kind: "position", group: "K", position: 1 }, away: { kind: "annex_c", groupWinner: "K" } },
  88: { home: { kind: "position", group: "D", position: 2 }, away: { kind: "position", group: "G", position: 2 } },
};

type AnnexCData = {
  assignments: Record<string, Record<string, string>>;
};

let annexCache: AnnexCData | null = null;

function loadAnnexC(): AnnexCData {
  if (annexCache) return annexCache;
  const file = path.join(process.cwd(), "data", "fifa-2026-annex-c-assignments.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as AnnexCData;
  annexCache = raw;
  return raw;
}

function resolvePosition(
  tables: ReturnType<typeof buildGroupTables>,
  group: string,
  position: 1 | 2,
): string | null {
  const table = tables.get(group);
  if (!table?.complete) return null;
  return table.rows.find((r) => r.rank === position)?.teamId ?? null;
}

function annexKey(groups: string[]): string {
  return [...groups].sort().join(",");
}

function resolveAnnexThird(
  tables: ReturnType<typeof buildGroupTables>,
  advancingGroups: string[],
  groupWinner: string,
): string | null {
  const key = annexKey(advancingGroups);
  const lookup = loadAnnexC().assignments[key];
  if (!lookup) return null;
  const thirdGroup = lookup[`1${groupWinner}`]?.replace(/^3/, "");
  if (!thirdGroup) return null;
  const table = tables.get(thirdGroup);
  if (!table?.complete) return null;
  return table.rows.find((r) => r.rank === 3)?.teamId ?? null;
}

/** Build map: source match number → downstream slots to fill when winner/loser known. */
function buildFeedMap(
  matches: { id: string; matchNumber: number; homeSeedLabel: string | null; awaySeedLabel: string | null }[],
): Map<string, { matchId: string; side: "home" | "away" }[]> {
  const feeds = new Map<string, { matchId: string; side: "home" | "away" }[]>();

  function addFeed(label: string | null, targetMatchId: string, side: "home" | "away") {
    if (!label) return;
    const m = label.match(/^([WL])(\d+)$/);
    if (!m) return;
    const key = `${m[1]}${m[2]}`;
    const arr = feeds.get(key) ?? [];
    arr.push({ matchId: targetMatchId, side });
    feeds.set(key, arr);
  }

  for (const m of matches) {
    addFeed(m.homeSeedLabel, m.id, "home");
    addFeed(m.awaySeedLabel, m.id, "away");
  }
  return feeds;
}

export interface BracketSyncResult {
  r32Filled: number;
  winnersPropagated: number;
  qualifiersMarked: number;
  allGroupsComplete: boolean;
  championSet: boolean;
}

/**
 * When the Final (match 104 / round FINAL) is finalized, mark its winner as champion.
 * Clears any previous champion flag so standings award the +8 correctly.
 */
export async function syncChampionFromFinal(tournamentId: string): Promise<boolean> {
  const final = await prisma.match.findFirst({
    where: {
      tournamentId,
      OR: [{ round: "FINAL" }, { matchNumber: 104 }],
    },
    include: { actualResult: true },
    orderBy: { matchNumber: "desc" },
  });

  const winnerId = final?.actualResult?.finalized ? final.actualResult.winnerTeamId : null;
  if (!winnerId) return false;

  const current = await prisma.actualTeamStatus.findFirst({
    where: { tournamentId, champion: true },
    select: { teamId: true },
  });
  if (current?.teamId === winnerId) return false;

  await prisma.actualTeamStatus.updateMany({
    where: { tournamentId, champion: true },
    data: { champion: false },
  });
  await prisma.actualTeamStatus.upsert({
    where: { tournamentId_teamId: { tournamentId, teamId: winnerId } },
    create: { tournamentId, teamId: winnerId, champion: true, qualifiedToKnockout: true },
    update: { champion: true },
  });
  return true;
}

/** Fill R32 teams from group tables + propagate knockout winners into later rounds. */
export async function syncTournamentBracket(tournamentId: string): Promise<BracketSyncResult> {
  const [teams, matches] = await Promise.all([
    prisma.team.findMany({ where: { tournamentId } }),
    prisma.match.findMany({
      where: { tournamentId },
      include: { actualResult: true },
      orderBy: { matchNumber: "asc" },
    }),
  ]);

  const groupMatches = matches.filter((m) => m.stage === STAGES.GROUP);
  const tables = buildGroupTables(
    teams,
    groupMatches.map((m) => ({
      groupCode: m.groupCode,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      result: m.actualResult,
    })),
  );

  const allGroupsComplete = [...tables.values()].every((t) => t.complete);
  const topThirds = rankThirdPlaceTeams(tables);
  const advancingGroups = topThirds.map((t) => t.groupCode);

  let r32Filled = 0;

  for (const m of matches.filter((x) => x.round === "R32")) {
    const slots = R32_SLOTS[m.matchNumber];
    if (!slots) continue;

    let homeId: string | null = null;
    let awayId: string | null = null;

    if (slots.home.kind === "position") {
      homeId = resolvePosition(tables, slots.home.group, slots.home.position);
    }
    if (slots.away.kind === "position") {
      awayId = resolvePosition(tables, slots.away.group, slots.away.position);
    }
    if (slots.away.kind === "annex_c" && allGroupsComplete && advancingGroups.length === 8) {
      awayId = resolveAnnexThird(tables, advancingGroups, slots.away.groupWinner);
    }
    if (slots.home.kind === "annex_c" && allGroupsComplete && advancingGroups.length === 8) {
      homeId = resolveAnnexThird(tables, advancingGroups, slots.home.groupWinner);
    }

    const updates: { homeTeamId?: string | null; awayTeamId?: string | null } = {};
    if (homeId && m.homeTeamId !== homeId) updates.homeTeamId = homeId;
    if (awayId && m.awayTeamId !== awayId) updates.awayTeamId = awayId;
    if (Object.keys(updates).length > 0) {
      await prisma.match.update({ where: { id: m.id }, data: updates });
      r32Filled++;
    }
  }

  // Mark knockout qualifiers when group stage is complete.
  let qualifiersMarked = 0;
  if (allGroupsComplete && advancingGroups.length === 8) {
    const { teamIds: qualifierIds } = selectAdvancingTeams(tables);

    for (const teamId of qualifierIds) {
      await prisma.actualTeamStatus.upsert({
        where: { tournamentId_teamId: { tournamentId, teamId } },
        create: { tournamentId, teamId, qualifiedToKnockout: true },
        update: { qualifiedToKnockout: true },
      });
      qualifiersMarked++;
    }
  }

  // Propagate knockout winners/losers into downstream fixtures.
  const feedMap = buildFeedMap(matches.filter((m) => m.stage === STAGES.KNOCKOUT));

  let winnersPropagated = 0;
  for (const m of matches.filter((x) => x.stage === STAGES.KNOCKOUT && x.actualResult?.finalized)) {
    const winnerId = m.actualResult?.winnerTeamId;
    if (!winnerId) continue;

    const homeGoals = m.actualResult?.normalHomeGoals;
    const awayGoals = m.actualResult?.normalAwayGoals;
    let loserId: string | null = null;
    if (homeGoals !== null && awayGoals !== null && m.homeTeamId && m.awayTeamId) {
      loserId = winnerId === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
    }

    for (const kind of ["W", "L"] as const) {
      const teamId = kind === "W" ? winnerId : loserId;
      if (!teamId) continue;
      const targets = feedMap.get(`${kind}${m.matchNumber}`) ?? [];
      for (const t of targets) {
        const target = matches.find((x) => x.id === t.matchId);
        if (!target) continue;
        const data = t.side === "home" ? { homeTeamId: teamId } : { awayTeamId: teamId };
        const current = t.side === "home" ? target.homeTeamId : target.awayTeamId;
        if (current !== teamId) {
          await prisma.match.update({ where: { id: target.id }, data });
          winnersPropagated++;
        }
      }
    }
  }

  const championSet = await syncChampionFromFinal(tournamentId);

  return { r32Filled, winnersPropagated, qualifiersMarked, allGroupsComplete, championSet };
}

/** Apply scores from src/lib/wc-results.ts to group matches not yet finalized. */
export async function applyKnownResults(tournamentId: string): Promise<number> {
  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      stage: STAGES.GROUP,
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
    include: { homeTeam: true, awayTeam: true, actualResult: true },
  });

  let applied = 0;
  for (const m of matches) {
    if (!m.homeTeam || !m.awayTeam) continue;
    if (m.actualResult?.finalized) continue;
    const score = lookupResult(m.homeTeam.name, m.awayTeam.name);
    if (!score) continue;

    await prisma.actualResult.upsert({
      where: { matchId: m.id },
      create: {
        matchId: m.id,
        normalHomeGoals: score.home,
        normalAwayGoals: score.away,
        finalized: score.finalized ?? true,
      },
      update: {
        normalHomeGoals: score.home,
        normalAwayGoals: score.away,
        finalized: score.finalized ?? true,
      },
    });
    await prisma.match.update({
      where: { id: m.id },
      data: { status: score.finalized ? MATCH_STATUS.FINISHED : MATCH_STATUS.SCHEDULED },
    });
    applied++;
  }
  return applied;
}

/** Import web-known scores, then fill bracket slots from standings. */
export async function refreshBracketFromResults(tournamentId: string): Promise<BracketSyncResult & { resultsApplied: number }> {
  const resultsApplied = await applyKnownResults(tournamentId);
  const sync = await syncTournamentBracket(tournamentId);
  return { ...sync, resultsApplied };
}
