"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { generateReadablePassword } from "@/lib/user-utils";
import { getActiveTournament } from "@/lib/standings";
import { resolveKnockoutWinner } from "@/lib/scoring";
import { MATCH_STATUS, STAGES } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

export interface AdminResult {
  ok: boolean;
  message: string;
}

async function audit(
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  before: Prisma.InputJsonValue | undefined,
  after: Prisma.InputJsonValue | undefined,
) {
  await prisma.auditLog.create({
    data: { actorUserId, action, entityType, entityId, beforeJson: before, afterJson: after },
  });
}

function revalidateAll() {
  revalidatePath("/admin");
  revalidatePath("/admin/results");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  revalidatePath("/predictions");
}

const optGoal = z.union([z.coerce.number().int().min(0).max(99), z.null()]).optional();

const resultSchema = z.object({
  matchId: z.string().min(1),
  normalHome: optGoal,
  normalAway: optGoal,
  extraHome: optGoal,
  extraAway: optGoal,
  penaltyHome: optGoal,
  penaltyAway: optGoal,
  winner: z.enum(["HOME", "AWAY"]).nullable().optional(),
  finalized: z.boolean().optional(),
});

export async function saveResult(input: z.input<typeof resultSchema>): Promise<AdminResult> {
  const admin = await requireAdmin();
  const tournament = await getActiveTournament();
  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid result values." };
  const data = parsed.data;

  const match = await prisma.match.findFirst({
    where: { id: data.matchId, tournamentId: tournament.id },
    include: { actualResult: true },
  });
  if (!match) return { ok: false, message: "Match not found." };

  const nh = data.normalHome ?? null;
  const na = data.normalAway ?? null;

  // Derive winner team for knockout matches.
  let winnerTeamId: string | null = null;
  if (match.stage === STAGES.KNOCKOUT && nh !== null && na !== null) {
    const side =
      data.winner ??
      resolveKnockoutWinner({
        normal: { home: nh, away: na },
        extra: { home: data.extraHome ?? null, away: data.extraAway ?? null },
        penalty: { home: data.penaltyHome ?? null, away: data.penaltyAway ?? null },
      });
    if (data.finalized && side === null) {
      return {
        ok: false,
        message: `Match ${match.matchNumber}: cannot finalize a tied knockout without a winner.`,
      };
    }
    winnerTeamId = side === "HOME" ? match.homeTeamId : side === "AWAY" ? match.awayTeamId : null;
  }

  const finalized = data.finalized ?? match.actualResult?.finalized ?? false;
  const payload = {
    normalHomeGoals: nh,
    normalAwayGoals: na,
    extraHomeGoals: data.extraHome ?? null,
    extraAwayGoals: data.extraAway ?? null,
    penaltyHomeGoals: data.penaltyHome ?? null,
    penaltyAwayGoals: data.penaltyAway ?? null,
    winnerTeamId,
    finalized,
  };

  await prisma.actualResult.upsert({
    where: { matchId: match.id },
    create: { matchId: match.id, ...payload },
    update: payload,
  });
  await prisma.match.update({
    where: { id: match.id },
    data: { status: finalized ? MATCH_STATUS.FINISHED : MATCH_STATUS.SCHEDULED },
  });
  await audit(admin.id, finalized ? "FINALIZE_RESULT" : "SAVE_RESULT", "Match", match.id, undefined, payload);

  revalidateAll();
  return { ok: true, message: `Match ${match.matchNumber} ${finalized ? "finalized" : "saved"}.` };
}

export async function bulkSaveResults(inputs: z.input<typeof resultSchema>[]): Promise<AdminResult> {
  let ok = 0;
  for (const input of inputs) {
    const res = await saveResult(input);
    if (res.ok) ok++;
    else return res; // surface first error
  }
  return { ok: true, message: `Saved ${ok} result(s).` };
}

export async function setMatchFinalized(matchId: string, finalized: boolean): Promise<AdminResult> {
  const admin = await requireAdmin();
  const result = await prisma.actualResult.findUnique({ where: { matchId } });
  if (!result) return { ok: false, message: "Enter a score before finalizing." };
  await prisma.actualResult.update({ where: { matchId }, data: { finalized } });
  await prisma.match.update({
    where: { id: matchId },
    data: { status: finalized ? MATCH_STATUS.FINISHED : MATCH_STATUS.SCHEDULED },
  });
  await audit(admin.id, finalized ? "FINALIZE" : "UNFINALIZE", "Match", matchId, undefined, { finalized });
  revalidateAll();
  return { ok: true, message: finalized ? "Finalized." : "Reopened." };
}

export async function setUserPaid(userId: string, paid: boolean): Promise<AdminResult> {
  const admin = await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { paid } });
  await audit(admin.id, "SET_PAID", "User", userId, undefined, { paid });
  revalidateAll();
  revalidatePath("/admin/users");
  return { ok: true, message: paid ? "Marked as paid." : "Marked as unpaid." };
}

export async function setUserActive(userId: string, active: boolean): Promise<AdminResult> {
  const admin = await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { active } });
  await audit(admin.id, "SET_ACTIVE", "User", userId, undefined, { active });
  revalidatePath("/admin/users");
  revalidateAll();
  return { ok: true, message: active ? "Activated." : "Deactivated." };
}

export async function setTeamQualified(teamId: string, qualified: boolean): Promise<AdminResult> {
  const admin = await requireAdmin();
  const tournament = await getActiveTournament();
  await prisma.actualTeamStatus.upsert({
    where: { tournamentId_teamId: { tournamentId: tournament.id, teamId } },
    create: { tournamentId: tournament.id, teamId, qualifiedToKnockout: qualified },
    update: { qualifiedToKnockout: qualified },
  });
  await audit(admin.id, "SET_QUALIFIED", "Team", teamId, undefined, { qualified });
  revalidateAll();
  revalidatePath("/admin/teams");
  return { ok: true, message: "Updated." };
}

export async function setChampionTeam(teamId: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const tournament = await getActiveTournament();
  // Clear previous champion, set the new one.
  await prisma.actualTeamStatus.updateMany({
    where: { tournamentId: tournament.id, champion: true },
    data: { champion: false },
  });
  await prisma.actualTeamStatus.upsert({
    where: { tournamentId_teamId: { tournamentId: tournament.id, teamId } },
    create: { tournamentId: tournament.id, teamId, champion: true },
    update: { champion: true },
  });
  await audit(admin.id, "SET_CHAMPION", "Team", teamId, undefined, { champion: true });
  revalidateAll();
  revalidatePath("/admin/teams");
  return { ok: true, message: "Champion set." };
}

export async function clearChampionTeam(): Promise<AdminResult> {
  const admin = await requireAdmin();
  const tournament = await getActiveTournament();
  await prisma.actualTeamStatus.updateMany({
    where: { tournamentId: tournament.id, champion: true },
    data: { champion: false },
  });
  await audit(admin.id, "CLEAR_CHAMPION", "Tournament", tournament.id, undefined, undefined);
  revalidateAll();
  revalidatePath("/admin/teams");
  return { ok: true, message: "Champion cleared." };
}

const teamSchema = z.object({
  name: z.string().min(1).max(60),
  groupCode: z.string().max(4).nullable().optional(),
});

export async function updateTeam(teamId: string, input: z.input<typeof teamSchema>): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = teamSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid team data." };
  await prisma.team.update({
    where: { id: teamId },
    data: { name: parsed.data.name.trim(), groupCode: parsed.data.groupCode || null },
  });
  await audit(admin.id, "UPDATE_TEAM", "Team", teamId, undefined, parsed.data);
  revalidateAll();
  revalidatePath("/admin/teams");
  return { ok: true, message: "Team updated." };
}

const deadlineSchema = z.object({
  phase: z.string().min(1),
  lockAt: z.string().nullable().optional(),
  isOpen: z.boolean(),
});

export async function updateDeadline(input: z.input<typeof deadlineSchema>): Promise<AdminResult> {
  const admin = await requireAdmin();
  const tournament = await getActiveTournament();
  const parsed = deadlineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid deadline." };
  const lockAt = parsed.data.lockAt ? new Date(parsed.data.lockAt) : null;
  if (parsed.data.lockAt && Number.isNaN(lockAt!.getTime())) {
    return { ok: false, message: "Invalid date." };
  }
  await prisma.deadline.upsert({
    where: { tournamentId_phase: { tournamentId: tournament.id, phase: parsed.data.phase } },
    create: { tournamentId: tournament.id, phase: parsed.data.phase, lockAt, isOpen: parsed.data.isOpen },
    update: { lockAt, isOpen: parsed.data.isOpen },
  });
  await audit(admin.id, "UPDATE_DEADLINE", "Deadline", parsed.data.phase, undefined, parsed.data);
  revalidateAll();
  revalidatePath("/admin/deadlines");
  return { ok: true, message: "Deadline updated." };
}

const settingsSchema = z.object({
  entryFee: z.coerce.number().int().min(0),
  knockoutPickCount: z.coerce.number().int().min(1).max(48),
  kickoffLockMinutes: z.coerce.number().int().min(0).max(24 * 60),
  registrationOpen: z.boolean(),
  prizeSplit: z.record(z.string(), z.coerce.number().min(0).max(1)),
});

export async function updateSettings(input: z.input<typeof settingsSchema>): Promise<AdminResult> {
  const admin = await requireAdmin();
  const tournament = await getActiveTournament();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid settings." };
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: {
      entryFee: parsed.data.entryFee,
      knockoutPickCount: parsed.data.knockoutPickCount,
      kickoffLockMinutes: parsed.data.kickoffLockMinutes,
      registrationOpen: parsed.data.registrationOpen,
      prizeSplitJson: parsed.data.prizeSplit,
    },
  });
  await audit(admin.id, "UPDATE_SETTINGS", "Tournament", tournament.id, undefined, parsed.data);
  revalidateAll();
  revalidatePath("/admin/settings");
  return { ok: true, message: "Settings saved." };
}

const koMatchSchema = z.object({
  round: z.enum(["R32", "R16", "QF", "SF", "3RD", "FINAL"]),
  homeTeamId: z.string().nullable().optional(),
  awayTeamId: z.string().nullable().optional(),
  homeSeedLabel: z.string().max(20).nullable().optional(),
  awaySeedLabel: z.string().max(20).nullable().optional(),
  scheduledAt: z.string(),
});

export async function createKnockoutMatch(input: z.input<typeof koMatchSchema>): Promise<AdminResult> {
  const admin = await requireAdmin();
  const tournament = await getActiveTournament();
  const parsed = koMatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid match data." };
  const max = await prisma.match.aggregate({
    where: { tournamentId: tournament.id },
    _max: { matchNumber: true },
  });
  const nextNumber = Math.max(100, max._max.matchNumber ?? 100) + 1;
  const date = new Date(parsed.data.scheduledAt);
  await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      matchNumber: nextNumber,
      stage: STAGES.KNOCKOUT,
      round: parsed.data.round,
      scheduledAt: Number.isNaN(date.getTime()) ? new Date() : date,
      homeTeamId: parsed.data.homeTeamId || null,
      awayTeamId: parsed.data.awayTeamId || null,
      homeSeedLabel: parsed.data.homeSeedLabel || null,
      awaySeedLabel: parsed.data.awaySeedLabel || null,
    },
  });
  await audit(admin.id, "CREATE_KO_MATCH", "Match", String(nextNumber), undefined, parsed.data);
  revalidateAll();
  revalidatePath("/admin/fixtures");
  return { ok: true, message: `Created match #${nextNumber}.` };
}

export async function deleteMatch(matchId: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  await prisma.match.delete({ where: { id: matchId } });
  await audit(admin.id, "DELETE_MATCH", "Match", matchId, undefined, undefined);
  revalidateAll();
  revalidatePath("/admin/fixtures");
  return { ok: true, message: "Match deleted." };
}

export async function recalculate(): Promise<AdminResult> {
  const admin = await requireAdmin();
  // Scoring is computed on demand from finalized results; this revalidates caches
  // and records the action in the audit log.
  await audit(admin.id, "RECALCULATE", "Tournament", null, undefined, undefined);
  revalidateAll();
  return { ok: true, message: "Standings recalculated." };
}

const userProfileSchema = z.object({
  firstName: z.string().min(1).max(40),
  lastName: z.string().max(40),
  email: z.string().email(),
});

export async function updateUserProfile(
  userId: string,
  input: z.input<typeof userProfileSchema>,
): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = userProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid profile data." };
  const { firstName, lastName, email } = parsed.data;
  const name = lastName.trim() ? `${firstName.trim()} ${lastName.trim()}` : firstName.trim();
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { firstName: firstName.trim(), lastName: lastName.trim(), name, email: email.toLowerCase().trim() },
    });
  } catch {
    return { ok: false, message: "Email already in use." };
  }
  await audit(admin.id, "UPDATE_USER", "User", userId, undefined, parsed.data);
  revalidatePath("/admin/users");
  return { ok: true, message: "Profile updated." };
}

export async function generateUserPassword(userId: string): Promise<AdminResult & { password?: string }> {
  const admin = await requireAdmin();
  const password = generateReadablePassword();
  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, plainPassword: password },
  });
  await audit(admin.id, "RESET_PASSWORD", "User", userId, undefined, { generated: true });
  revalidatePath("/admin/users");
  return { ok: true, message: `New password: ${password}`, password };
}
