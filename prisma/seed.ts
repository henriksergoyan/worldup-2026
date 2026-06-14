import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import {
  parseMainWorkbook,
  defaultWorkbookPath,
  type ParsedWorkbook,
} from "./import";
import { KNOCKOUT_FIXTURES, knockoutScheduledAt } from "../src/lib/knockout-bracket";
import { EXCEL_DEADLINES } from "../src/lib/excel-deadlines";
import { refreshBracketFromResults } from "../src/lib/bracket-engine";
import { lookupResult } from "../src/lib/wc-results";
import { splitDisplayName } from "../src/lib/user-utils";

const prisma = new PrismaClient();

const PLAYER_PASSWORD = "password123";
const ADMIN_PASSWORD = "admin123";

// Fallback data used if the workbook is not present (keeps `db seed` reliable).
const FALLBACK_TEAMS = [
  "Mexico", "South Africa", "South Korea", "Czech Republic", "Canada",
  "Bosnia and Herzegovina", "Qatar", "Switzerland", "Brazil", "Morocco",
  "Haiti", "Scotland", "United States", "Paraguay", "Australia", "Turkey",
  "Germany", "Curaçao", "Ivory Coast", "Ecuador", "Netherlands", "Japan",
  "Sweden", "Tunisia", "Belgium", "Egypt", "Iran", "New Zealand", "Spain",
  "Cape Verde", "Saudi Arabia", "Uruguay", "France", "Senegal", "Iraq",
  "Norway", "Argentina", "Algeria", "Austria", "Jordan", "Portugal",
  "DR Congo", "Uzbekistan", "Colombia", "England", "Croatia", "Ghana", "Panama",
];
const FALLBACK_PLAYERS = [
  "Abel", "Aleksandr", "Ara", "Aram GM", "Aram Tsh.", "Arsen", "Art Cap",
  "Art Doc", "Davit", "Edgar H.", "Edgar M.", "Gagik St.", "Hayk St.",
  "Henrik", "Hovo St.", "Konstantin", "Levon M.", "Levon T.", "Mark", "Rench",
  "Ruben", "Sipan", "Tigran Gr.", "Tigran H.", "Tigran Tsh.", "Vigen",
  "Edmon", "Minas",
];

function slugifyEmail(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return `${slug}@example.com`;
}

function buildFallback(): ParsedWorkbook {
  const groups = "ABCDEFGHIJKL".split("");
  const teams = FALLBACK_TEAMS.map((name, i) => ({
    name,
    groupCode: groups[Math.floor(i / 4)],
  }));
  // Round-robin fixtures (6 per group of 4): (1v2,3v4,1v3,2v4,1v4,2v3)
  const pairs = [
    [0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2],
  ];
  const fixtures = [];
  let mn = 0;
  const start = new Date();
  start.setDate(start.getDate() + 1);
  for (let g = 0; g < 12; g++) {
    for (const [a, b] of pairs) {
      mn += 1;
      const groupTeams = teams.slice(g * 4, g * 4 + 4);
      fixtures.push({
        matchNumber: mn,
        groupCode: groups[g],
        homeTeam: groupTeams[a].name,
        awayTeam: groupTeams[b].name,
        scheduledAt: new Date(start.getTime() + mn * 3 * 60 * 60 * 1000),
      });
    }
  }
  return {
    players: FALLBACK_PLAYERS,
    teams,
    fixtures,
    predictions: [],
    entryFee: 10000,
    prizeSplit: { "1": 0.4, "2": 0.2, "3": 0.15, "4": 0.1, "5": 0.07, "6": 0.05, "7": 0.03 },
  };
}

async function main() {
  console.log("Seeding World Cup 2026 prediction database...");

  const workbookPath = defaultWorkbookPath();
  let data: ParsedWorkbook;
  if (fs.existsSync(workbookPath)) {
    console.log(`Importing from workbook: ${workbookPath}`);
    data = parseMainWorkbook(workbookPath);
  } else {
    console.log("Workbook not found, using built-in fallback dataset.");
    data = buildFallback();
  }

  // Canonical player list = workbook players + anyone who has predictions.
  const playerSet = new Set<string>([...data.players]);
  for (const p of data.predictions) playerSet.add(p.player);
  for (const p of FALLBACK_PLAYERS) playerSet.add(p);
  const players = [...playerSet];

  console.log(
    `Parsed: ${data.teams.length} teams, ${data.fixtures.length} fixtures, ` +
      `${players.length} players, ${data.predictions.length} predictions.`,
  );

  // Clean slate (FK-safe order).
  await prisma.auditLog.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.actualResult.deleteMany();
  await prisma.teamPick.deleteMany();
  await prisma.actualTeamStatus.deleteMany();
  await prisma.match.deleteMany();
  await prisma.deadline.deleteMany();
  await prisma.team.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.user.deleteMany();

  // --- Tournament ---
  const tournament = await prisma.tournament.create({
    data: {
      name: "FIFA World Cup 2026",
      timezone: "Asia/Yerevan",
      entryFee: data.entryFee,
      prizeSplitJson: data.prizeSplit,
      knockoutPickCount: 16,
      kickoffLockMinutes: 60,
      registrationOpen: true,
    },
  });

  // --- Teams ---
  await prisma.team.createMany({
    data: data.teams.map((t) => ({
      tournamentId: tournament.id,
      name: t.name,
      groupCode: t.groupCode,
    })),
  });
  const teams = await prisma.team.findMany({ where: { tournamentId: tournament.id } });
  const teamByName = new Map(teams.map((t) => [t.name, t]));

  // --- Users (admin + players) ---
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const playerHash = await bcrypt.hash(PLAYER_PASSWORD, 10);

  await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "",
      name: "Admin",
      email: "admin@example.com",
      passwordHash: adminHash,
      plainPassword: ADMIN_PASSWORD,
      role: "ADMIN",
      paid: true,
      active: true,
    },
  });

  const usedEmails = new Set<string>(["admin@example.com"]);
  for (const displayName of players) {
    let email = slugifyEmail(displayName);
    let n = 2;
    while (usedEmails.has(email)) {
      email = slugifyEmail(displayName).replace("@", `${n}@`);
      n += 1;
    }
    usedEmails.add(email);
    const { firstName, lastName } = splitDisplayName(displayName);
    await prisma.user.create({
      data: {
        firstName,
        lastName,
        name: displayName,
        email,
        passwordHash: playerHash,
        plainPassword: PLAYER_PASSWORD,
        role: "PLAYER",
        paid: true,
        active: true,
      },
    });
  }
  const users = await prisma.user.findMany();
  const userByName = new Map(users.map((u) => [u.name, u]));

  // --- Group-stage fixtures ---
  await prisma.match.createMany({
    data: data.fixtures.map((f) => ({
      tournamentId: tournament.id,
      matchNumber: f.matchNumber,
      stage: "GROUP",
      groupCode: f.groupCode,
      scheduledAt: f.scheduledAt,
      homeTeamId: teamByName.get(f.homeTeam)?.id ?? null,
      awayTeamId: teamByName.get(f.awayTeam)?.id ?? null,
    })),
  });

  // --- Full FIFA knockout bracket (matches 73–104) ---
  await prisma.match.createMany({
    data: KNOCKOUT_FIXTURES.map((ko) => ({
      tournamentId: tournament.id,
      matchNumber: ko.matchNumber,
      stage: "KNOCKOUT",
      round: ko.round,
      scheduledAt: knockoutScheduledAt(ko),
      homeSeedLabel: ko.homeSeedLabel,
      awaySeedLabel: ko.awaySeedLabel,
    })),
  });

  const matches = await prisma.match.findMany({
    where: { tournamentId: tournament.id },
    include: { homeTeam: true, awayTeam: true },
  });
  const matchByNumber = new Map(matches.map((m) => [m.matchNumber, m]));

  // --- Apply real World Cup 2026 results (Jun 11–13) ---
  let resultsApplied = 0;
  for (const m of matches) {
    if (!m.homeTeam || !m.awayTeam) continue;
    const score = lookupResult(m.homeTeam.name, m.awayTeam.name);
    if (!score) continue;
    await prisma.actualResult.create({
      data: {
        matchId: m.id,
        normalHomeGoals: score.home,
        normalAwayGoals: score.away,
        finalized: score.finalized ?? true,
      },
    });
    await prisma.match.update({
      where: { id: m.id },
      data: { status: "FINISHED" },
    });
    resultsApplied += 1;
  }
  console.log(`Applied ${resultsApplied} actual results from World Cup 2026.`);

  // --- Imported group-stage predictions ---
  if (data.predictions.length > 0) {
    const predRows = [];
    for (const p of data.predictions) {
      const user = userByName.get(p.player);
      const match = matchByNumber.get(p.matchNumber);
      if (!user || !match) continue;
      predRows.push({
        userId: user.id,
        matchId: match.id,
        normalHomeGoals: p.home,
        normalAwayGoals: p.away,
      });
    }
    for (let i = 0; i < predRows.length; i += 500) {
      await prisma.prediction.createMany({ data: predRows.slice(i, i + 500) });
    }
    console.log(`Inserted ${predRows.length} predictions.`);
  }

  // --- Deadlines from Excel ToR sheet (Asia/Yerevan) ---
  for (const d of EXCEL_DEADLINES) {
    await prisma.deadline.create({
      data: {
        tournamentId: tournament.id,
        phase: d.phase,
        lockAt: d.lockAt,
        isOpen: true,
      },
    });
  }

  const bracket = await refreshBracketFromResults(tournament.id);
  console.log(
    `Bracket sync: ${bracket.resultsApplied} web scores, ${bracket.r32Filled} R32 slots, ${bracket.qualifiersMarked} qualifiers.`,
  );

  console.log("\nSeed complete.");
  console.log("Login credentials:");
  console.log("  ADMIN  -> admin@example.com / admin123");
  console.log("  PLAYER -> henrik@example.com / password123 (and others, see README)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
