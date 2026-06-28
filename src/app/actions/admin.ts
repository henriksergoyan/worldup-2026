"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { generateReadablePassword, buildUsername, formatUserName } from "@/lib/user-utils";
import { getActiveTournament } from "@/lib/standings";
import { resolveKnockoutWinner, sanitizeKnockoutExtras } from "@/lib/scoring";
import { refreshBracketFromResults } from "@/lib/bracket-engine";
import { EXCEL_DEADLINES } from "@/lib/excel-deadlines";
import { syncTeamPicksFromWorkbook } from "@/lib/sync-team-picks";
import { MATCH_STATUS, PHASES, STAGES } from "@/lib/constants";
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
  revalidatePath("/admin/fixtures");
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

function deriveFinalized(
  stage: string,
  normalHome: number | null,
  normalAway: number | null,
  winnerTeamId: string | null,
): boolean {
  if (normalHome === null || normalAway === null) return false;
  if (stage === STAGES.KNOCKOUT) return winnerTeamId !== null;
  return true;
}

async function performRecalculate(adminId: string, tournamentId: string) {
  for (const d of EXCEL_DEADLINES) {
    await prisma.deadline.upsert({
      where: { tournamentId_phase: { tournamentId, phase: d.phase } },
      create: {
        tournamentId,
        phase: d.phase,
        lockAt: d.lockAt,
        isOpen: true,
      },
      update: { lockAt: d.lockAt },
    });
  }
  await prisma.deadline.deleteMany({
    where: { tournamentId, phase: PHASES.KNOCKOUT_TEAMS },
  });

  const picks = await syncTeamPicksFromWorkbook(tournamentId);
  const result = await refreshBracketFromResults(tournamentId);
  await audit(adminId, "RECALCULATE", "Tournament", tournamentId, undefined, {
    resultsApplied: result.resultsApplied,
    r32Filled: result.r32Filled,
    winnersPropagated: result.winnersPropagated,
    qualifiersMarked: result.qualifiersMarked,
    championPicks: picks.champions,
  });
  return { picks, result };
}

export async function saveResult(
  input: z.input<typeof resultSchema>,
  options?: { deferRecalc?: boolean },
): Promise<AdminResult> {
  const admin = await requireAdmin();
  const tournament = await getActiveTournament();
  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Արդյունքի տվյալները սխալ են։" };
  const data = parsed.data;

  const match = await prisma.match.findFirst({
    where: { id: data.matchId, tournamentId: tournament.id },
    include: { actualResult: true },
  });
  if (!match) return { ok: false, message: "Խաղը չի գտնվել։" };

  const nh = data.normalHome ?? null;
  const na = data.normalAway ?? null;

  let extraHome = data.extraHome ?? null;
  let extraAway = data.extraAway ?? null;
  let penaltyHome = data.penaltyHome ?? null;
  let penaltyAway = data.penaltyAway ?? null;
  if (match.stage === STAGES.KNOCKOUT && nh !== null && na !== null) {
    const sanitized = sanitizeKnockoutExtras({
      normal: { home: nh, away: na },
      extra: { home: extraHome, away: extraAway },
      penalty: { home: penaltyHome, away: penaltyAway },
    });
    extraHome = sanitized.extra.home;
    extraAway = sanitized.extra.away;
    penaltyHome = sanitized.penalty.home;
    penaltyAway = sanitized.penalty.away;
  }

  // Derive winner team for knockout matches.
  let winnerTeamId: string | null = null;
  if (match.stage === STAGES.KNOCKOUT && nh !== null && na !== null) {
    const side =
      data.winner ??
      resolveKnockoutWinner({
        normal: { home: nh, away: na },
        extra: { home: extraHome, away: extraAway },
        penalty: { home: penaltyHome, away: penaltyAway },
      });
    winnerTeamId = side === "HOME" ? match.homeTeamId : side === "AWAY" ? match.awayTeamId : null;
  }

  const finalized = deriveFinalized(match.stage, nh, na, winnerTeamId);
  const payload = {
    normalHomeGoals: nh,
    normalAwayGoals: na,
    extraHomeGoals: extraHome,
    extraAwayGoals: extraAway,
    penaltyHomeGoals: penaltyHome,
    penaltyAwayGoals: penaltyAway,
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

  if (finalized && !options?.deferRecalc) {
    await refreshBracketFromResults(tournament.id);
  }

  revalidateAll();
  return { ok: true, message: `Խաղ №${match.matchNumber} ${finalized ? "վերջնականացվեց" : "պահպանվեց"}։` };
}

export async function bulkSaveResults(inputs: z.input<typeof resultSchema>[]): Promise<AdminResult> {
  const admin = await requireAdmin();
  const tournament = await getActiveTournament();
  let ok = 0;
  for (const input of inputs) {
    const res = await saveResult(input, { deferRecalc: true });
    if (res.ok) ok++;
    else return res;
  }
  if (ok > 0) {
    await performRecalculate(admin.id, tournament.id);
    revalidateAll();
    return { ok: true, message: `Պահպանվեց ${ok} արդյունք և վերահաշվարկվեց։` };
  }
  return { ok: true, message: "Պահպանելու փոփոխություններ չկան։" };
}

export async function setMatchFinalized(matchId: string, finalized: boolean): Promise<AdminResult> {
  const admin = await requireAdmin();
  const result = await prisma.actualResult.findUnique({ where: { matchId } });
  if (!result) return { ok: false, message: "Վերջնականացնելուց առաջ մուտքագրեք հաշիվը։" };
  await prisma.actualResult.update({ where: { matchId }, data: { finalized } });
  await prisma.match.update({
    where: { id: matchId },
    data: { status: finalized ? MATCH_STATUS.FINISHED : MATCH_STATUS.SCHEDULED },
  });
  await audit(admin.id, finalized ? "FINALIZE" : "UNFINALIZE", "Match", matchId, undefined, { finalized });
  revalidateAll();
  return { ok: true, message: finalized ? "Վերջնականացվեց։" : "Վերաբացվեց։" };
}

export async function setUserPaid(userId: string, paid: boolean): Promise<AdminResult> {
  const admin = await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { paid } });
  await audit(admin.id, "SET_PAID", "User", userId, undefined, { paid });
  revalidateAll();
  revalidatePath("/admin/users");
  return { ok: true, message: paid ? "Նշվեց որպես վճարած։" : "Նշվեց որպես չվճարած։" };
}

export async function setUserActive(userId: string, active: boolean): Promise<AdminResult> {
  const admin = await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { active } });
  await audit(admin.id, "SET_ACTIVE", "User", userId, undefined, { active });
  revalidatePath("/admin/users");
  revalidateAll();
  return { ok: true, message: active ? "Ակտիվացվեց։" : "Անջատվեց։" };
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
  return { ok: true, message: "Թարմացվեց։" };
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
  return { ok: true, message: "Չեմպիոնը նշվեց։" };
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
  return { ok: true, message: "Չեմպիոնը մաքրվեց։" };
}

const teamSchema = z.object({
  name: z.string().min(1).max(60),
  groupCode: z.string().max(4).nullable().optional(),
});

export async function updateTeam(teamId: string, input: z.input<typeof teamSchema>): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = teamSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Թիմի տվյալները սխալ են։" };
  await prisma.team.update({
    where: { id: teamId },
    data: { name: parsed.data.name.trim(), groupCode: parsed.data.groupCode || null },
  });
  await audit(admin.id, "UPDATE_TEAM", "Team", teamId, undefined, parsed.data);
  revalidateAll();
  revalidatePath("/admin/teams");
  return { ok: true, message: "Թիմը թարմացվեց։" };
}

const deadlineSchema = z.object({
  phase: z.string().min(1),
  lockAt: z.string().nullable().optional(),
});

export async function updateDeadline(input: z.input<typeof deadlineSchema>): Promise<AdminResult> {
  const admin = await requireAdmin();
  const tournament = await getActiveTournament();
  const parsed = deadlineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Ժամկետի տվյալները սխալ են։" };
  const lockAt = parsed.data.lockAt ? new Date(parsed.data.lockAt) : null;
  if (parsed.data.lockAt && Number.isNaN(lockAt!.getTime())) {
    return { ok: false, message: "Ամսաթիվը սխալ է։" };
  }
  await prisma.deadline.upsert({
    where: { tournamentId_phase: { tournamentId: tournament.id, phase: parsed.data.phase } },
    create: { tournamentId: tournament.id, phase: parsed.data.phase, lockAt, isOpen: true },
    update: { lockAt, isOpen: true },
  });
  await audit(admin.id, "UPDATE_DEADLINE", "Deadline", parsed.data.phase, undefined, parsed.data);
  revalidateAll();
  revalidatePath("/admin/deadlines");
  return { ok: true, message: "Ժամկետը թարմացվեց։" };
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
  if (!parsed.success) return { ok: false, message: "Կարգավորումները սխալ են։" };
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
  return { ok: true, message: "Կարգավորումները պահպանվեցին։" };
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
  if (!parsed.success) return { ok: false, message: "Խաղի տվյալները սխալ են։" };
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
  return { ok: true, message: `Ստեղծվեց խաղ №${nextNumber}։` };
}

export async function deleteMatch(matchId: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  await prisma.match.delete({ where: { id: matchId } });
  await audit(admin.id, "DELETE_MATCH", "Match", matchId, undefined, undefined);
  revalidateAll();
  revalidatePath("/admin/fixtures");
  return { ok: true, message: "Խաղը հեռացվեց։" };
}

export async function recalculate(): Promise<AdminResult> {
  const admin = await requireAdmin();
  const tournament = await getActiveTournament();
  const { picks, result } = await performRecalculate(admin.id, tournament.id);
  revalidateAll();
  return {
    ok: true,
    message: `Թարմացվեց՝ ժամկետները համաժամեցվեցին, ${picks.champions} չեմպիոնի ընտրություն, ${result.resultsApplied} հաշիվ, ${result.r32Filled} R32 տեղ։`,
  };
}

const createUserSchema = z.object({
  firstName: z.string().min(1).max(40),
  lastName: z.string().max(40).optional(),
});

export async function createUser(
  input: z.input<typeof createUserSchema>,
): Promise<AdminResult & { username?: string; password?: string }> {
  const admin = await requireAdmin();
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Անունը սխալ է։" };

  const firstName = parsed.data.firstName.trim();
  const lastName = (parsed.data.lastName ?? "").trim();
  const name = formatUserName({ firstName, lastName });
  const username = buildUsername(firstName, lastName);
  const password = generateReadablePassword();
  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return { ok: false, message: `${username} օգտանունն արդեն գոյություն ունի։` };

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      name,
      username,
      passwordHash,
      plainPassword: password,
      role: "PLAYER",
      paid: false,
      active: true,
    },
  });

  await audit(admin.id, "CREATE_USER", "User", user.id, undefined, { username, name });
  revalidatePath("/admin/users");
  return { ok: true, message: `Ստեղծվեց ${name} (${username})`, username, password };
}

export async function deleteUser(userId: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (admin.id === userId) return { ok: false, message: "Չեք կարող հեռացնել սեփական հաշիվը։" };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, message: "Օգտատերը չի գտնվել։" };
  if (target.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
    if (admins <= 1) return { ok: false, message: "Հնարավոր չէ հեռացնել միակ ադմինիստրատորին։" };
  }

  await prisma.user.delete({ where: { id: userId } });
  await audit(admin.id, "DELETE_USER", "User", userId, { username: target.username }, undefined);
  revalidatePath("/admin/users");
  return { ok: true, message: `${target.name}-ը հեռացվեց։` };
}

const userProfileSchema = z.object({
  firstName: z.string().min(1).max(40),
  lastName: z.string().max(40),
});

export async function updateUserProfile(
  userId: string,
  input: z.input<typeof userProfileSchema>,
): Promise<AdminResult & { username?: string }> {
  const admin = await requireAdmin();
  const parsed = userProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Պրոֆիլի տվյալները սխալ են։" };
  const firstName = parsed.data.firstName.trim();
  const lastName = parsed.data.lastName.trim();
  const name = lastName ? `${firstName} ${lastName}` : firstName;
  const username = buildUsername(firstName, lastName);

  const conflict = await prisma.user.findFirst({
    where: { username, NOT: { id: userId } },
  });
  if (conflict) return { ok: false, message: `${username} օգտանունն արդեն զբաղված է։` };

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { firstName, lastName, name, username },
    });
  } catch {
    return { ok: false, message: "Պրոֆիլը թարմացնել չհաջողվեց։" };
  }
  await audit(admin.id, "UPDATE_USER", "User", userId, undefined, { firstName, lastName, username });
  revalidatePath("/admin/users");
  return { ok: true, message: `Պրոֆիլը թարմացվեց։ Մուտք՝ ${username}`, username };
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
  return { ok: true, message: `Նոր գաղտնաբառ՝ ${password}`, password };
}
