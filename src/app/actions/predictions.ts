"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getActiveTournament } from "@/lib/standings";
import { getDeadlineMap, isMatchLocked } from "@/lib/deadlines";
import { isKnockoutPredictionAmbiguous } from "@/lib/scoring";
import { PHASES, STAGES, TEAM_PICK_TYPES } from "@/lib/constants";

export interface ActionResult {
  ok: boolean;
  message: string;
  saved?: number;
  skipped?: number;
}

const goal = z.coerce.number().int().min(0).max(99);
const optGoal = z.union([goal, z.null()]).optional();

const groupItem = z.object({
  matchId: z.string().min(1),
  home: optGoal,
  away: optGoal,
});

export async function saveGroupPredictions(
  items: z.input<typeof groupItem>[],
): Promise<ActionResult> {
  const user = await requireUser();
  const tournament = await getActiveTournament();
  const deadlines = await getDeadlineMap(tournament.id);

  const parsed = z.array(groupItem).safeParse(items);
  if (!parsed.success) return { ok: false, message: "Invalid prediction values." };

  let saved = 0;
  let skipped = 0;
  for (const item of parsed.data) {
    const match = await prisma.match.findFirst({
      where: { id: item.matchId, tournamentId: tournament.id, stage: STAGES.GROUP },
    });
    if (!match) {
      skipped++;
      continue;
    }
    if (isMatchLocked(match, deadlines, tournament.kickoffLockMinutes)) {
      skipped++;
      continue;
    }
    const home = item.home ?? null;
    const away = item.away ?? null;
    if (home === null || away === null) {
      // Allow clearing a prediction
      await prisma.prediction.deleteMany({ where: { userId: user.id, matchId: match.id } });
      saved++;
      continue;
    }
    await prisma.prediction.upsert({
      where: { userId_matchId: { userId: user.id, matchId: match.id } },
      create: {
        userId: user.id,
        matchId: match.id,
        normalHomeGoals: home,
        normalAwayGoals: away,
      },
      update: { normalHomeGoals: home, normalAwayGoals: away },
    });
    saved++;
  }

  revalidatePath("/predictions");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: skipped > 0 ? `Saved ${saved}. ${skipped} locked match(es) skipped.` : `Saved ${saved} prediction(s).`,
    saved,
    skipped,
  };
}

const koItem = z.object({
  matchId: z.string().min(1),
  normalHome: optGoal,
  normalAway: optGoal,
  extraHome: optGoal,
  extraAway: optGoal,
  penaltyHome: optGoal,
  penaltyAway: optGoal,
  winner: z.enum(["HOME", "AWAY"]).nullable().optional(),
});

export async function saveKnockoutPredictions(
  items: z.input<typeof koItem>[],
): Promise<ActionResult> {
  const user = await requireUser();
  const tournament = await getActiveTournament();
  const deadlines = await getDeadlineMap(tournament.id);

  const parsed = z.array(koItem).safeParse(items);
  if (!parsed.success) return { ok: false, message: "Invalid prediction values." };

  let saved = 0;
  let skipped = 0;
  for (const item of parsed.data) {
    const match = await prisma.match.findFirst({
      where: { id: item.matchId, tournamentId: tournament.id, stage: STAGES.KNOCKOUT },
    });
    if (!match || isMatchLocked(match, deadlines, tournament.kickoffLockMinutes)) {
      skipped++;
      continue;
    }

    const nh = item.normalHome ?? null;
    const na = item.normalAway ?? null;
    if (nh === null || na === null) {
      await prisma.prediction.deleteMany({ where: { userId: user.id, matchId: match.id } });
      saved++;
      continue;
    }

    // Validation: the advancing team must be unambiguous once the tie is decided.
    const winnerSide = item.winner ?? null;
    const ambiguous = isKnockoutPredictionAmbiguous({
      normal: { home: nh, away: na },
      extra: { home: item.extraHome ?? null, away: item.extraAway ?? null },
      penalty: { home: item.penaltyHome ?? null, away: item.penaltyAway ?? null },
      winner: winnerSide,
    });
    if (ambiguous) {
      return {
        ok: false,
        message: `Match ${match.matchNumber}: tie is unresolved. Add extra time / penalties or a predicted winner.`,
      };
    }

    const predictedWinnerTeamId =
      winnerSide === "HOME" ? match.homeTeamId : winnerSide === "AWAY" ? match.awayTeamId : null;

    await prisma.prediction.upsert({
      where: { userId_matchId: { userId: user.id, matchId: match.id } },
      create: {
        userId: user.id,
        matchId: match.id,
        normalHomeGoals: nh,
        normalAwayGoals: na,
        extraHomeGoals: item.extraHome ?? null,
        extraAwayGoals: item.extraAway ?? null,
        penaltyHomeGoals: item.penaltyHome ?? null,
        penaltyAwayGoals: item.penaltyAway ?? null,
        predictedWinnerTeamId,
      },
      update: {
        normalHomeGoals: nh,
        normalAwayGoals: na,
        extraHomeGoals: item.extraHome ?? null,
        extraAwayGoals: item.extraAway ?? null,
        penaltyHomeGoals: item.penaltyHome ?? null,
        penaltyAwayGoals: item.penaltyAway ?? null,
        predictedWinnerTeamId,
      },
    });
    saved++;
  }

  revalidatePath("/predictions");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: skipped > 0 ? `Saved ${saved}. ${skipped} locked match(es) skipped.` : `Saved ${saved} prediction(s).`,
    saved,
    skipped,
  };
}

export async function setChampion(teamId: string | null): Promise<ActionResult> {
  const user = await requireUser();
  const tournament = await getActiveTournament();
  const deadlines = await getDeadlineMap(tournament.id);
  if (deadlines.get(PHASES.CHAMPION)?.locked) {
    return { ok: false, message: "Champion predictions are locked." };
  }

  await prisma.teamPick.deleteMany({
    where: { userId: user.id, tournamentId: tournament.id, type: TEAM_PICK_TYPES.CHAMPION },
  });
  if (teamId) {
    await prisma.teamPick.create({
      data: { userId: user.id, tournamentId: tournament.id, teamId, type: TEAM_PICK_TYPES.CHAMPION },
    });
  }
  revalidatePath("/predictions");
  revalidatePath("/dashboard");
  return { ok: true, message: teamId ? "Champion saved." : "Champion cleared." };
}

export async function setQualifierPicks(teamIds: string[]): Promise<ActionResult> {
  const user = await requireUser();
  const tournament = await getActiveTournament();
  const deadlines = await getDeadlineMap(tournament.id);
  if (deadlines.get(PHASES.KNOCKOUT_TEAMS)?.locked) {
    return { ok: false, message: "Team picks are locked." };
  }

  const unique = [...new Set(teamIds)];
  if (unique.length > tournament.knockoutPickCount) {
    return {
      ok: false,
      message: `Pick at most ${tournament.knockoutPickCount} teams.`,
    };
  }

  // Validate all teams belong to the tournament.
  const count = await prisma.team.count({
    where: { id: { in: unique }, tournamentId: tournament.id },
  });
  if (count !== unique.length) {
    return { ok: false, message: "Invalid team selection." };
  }

  await prisma.$transaction([
    prisma.teamPick.deleteMany({
      where: { userId: user.id, tournamentId: tournament.id, type: TEAM_PICK_TYPES.KNOCKOUT_QUALIFIER },
    }),
    prisma.teamPick.createMany({
      data: unique.map((teamId) => ({
        userId: user.id,
        tournamentId: tournament.id,
        teamId,
        type: TEAM_PICK_TYPES.KNOCKOUT_QUALIFIER,
      })),
    }),
  ]);

  revalidatePath("/predictions");
  revalidatePath("/dashboard");
  return { ok: true, message: `Saved ${unique.length} team pick(s).` };
}
