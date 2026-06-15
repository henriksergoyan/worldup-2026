// Excel import helpers for the World Cup 2026 prediction game.
//
// Parses the admin/main workbook `2026-WC-database-group-scores.xlsx`:
//   - players (Names sheet)
//   - teams + group codes (Group Stage fixtures order, 4 teams per group)
//   - 72 group-stage fixtures (Group Stage rows 4..75)
//   - every player's group-stage predictions (Group Stage player columns)
//   - ToR defaults (entry fee, prize split)
//
// This module is intentionally kept out of `src/` so it is never bundled into
// the Next.js client. It is used by `prisma/seed.ts` (run with tsx).

import path from "node:path";
import * as XLSX from "xlsx";
import { applyOfficialKickoffs } from "../src/lib/wc-fixtures";

export interface ParsedFixture {
  matchNumber: number;
  groupCode: string;
  homeTeam: string;
  awayTeam: string;
  scheduledAt: Date;
}

export interface ParsedPrediction {
  player: string;
  matchNumber: number;
  home: number;
  away: number;
}

export interface ParsedChampionPick {
  player: string;
  teamName: string;
}

export interface ParsedQualifierPick {
  player: string;
  teamName: string;
}

export interface ParsedWorkbook {
  players: string[];
  teams: { name: string; groupCode: string }[];
  fixtures: ParsedFixture[];
  predictions: ParsedPrediction[];
  championPicks: ParsedChampionPick[];
  qualifierPicks: ParsedQualifierPick[];
  entryFee: number;
  prizeSplit: Record<string, number>;
}

const GROUP_CODES = "ABCDEFGHIJKLMNOP".split("");
// The workbook fixtures are legacy 2022 dates; shift to the 2026 edition.
const YEAR_SHIFT = 4;
// Default tournament timezone offset (Asia/Yerevan, UTC+4).
const TZ_OFFSET_HOURS = 4;

function toMatrix(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as unknown[][];
}

/** Combine a workbook date cell + "HH:MM" local time into a UTC Date (shifted to 2026). */
function buildScheduledAt(dateCell: unknown, timeStr: unknown): Date {
  let year = 2026;
  let month = 5; // June (0-indexed) fallback
  let day = 11;
  if (dateCell instanceof Date) {
    year = dateCell.getUTCFullYear() + YEAR_SHIFT;
    month = dateCell.getUTCMonth();
    day = dateCell.getUTCDate();
  }
  let hh = 18;
  let mm = 0;
  if (typeof timeStr === "string" && /\d{1,2}:\d{2}/.test(timeStr)) {
    const [h, m] = timeStr.split(":").map((x) => parseInt(x, 10));
    hh = h;
    mm = m;
  }
  // Local Yerevan time -> UTC.
  return new Date(Date.UTC(year, month, day, hh - TZ_OFFSET_HOURS, mm, 0));
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function isMark(v: unknown): boolean {
  if (typeof v === "string") return v.toLowerCase() === "x" || v.toLowerCase() === "v";
  return false;
}

/** Parse champion (x) and knockout-qualifier (v) picks from the Playoff & Winner sheet. */
function parsePlayoffWinnerSheet(wb: XLSX.WorkBook): {
  championPicks: ParsedChampionPick[];
  qualifierPicks: ParsedQualifierPick[];
} {
  const sheet = wb.Sheets["Playoff & Winner"];
  if (!sheet) return { championPicks: [], qualifierPicks: [] };

  const m = toMatrix(sheet);
  const championPicks: ParsedChampionPick[] = [];
  const qualifierPicks: ParsedQualifierPick[] = [];

  const players: { name: string; vCol: number; xCol: number }[] = [];
  for (let c = 3; c < (m[1]?.length ?? 0); c += 4) {
    const name = m[1]?.[c];
    if (typeof name === "string" && name.trim()) {
      players.push({ name: name.trim(), vCol: c, xCol: c + 1 });
    }
  }

  for (let r = 3; r < m.length; r++) {
    const team = m[r]?.[0];
    if (typeof team !== "string" || !team.trim() || team === "Points") continue;
    const teamName = team.trim();

    for (const p of players) {
      if (isMark(m[r]?.[p.xCol])) championPicks.push({ player: p.name, teamName });
      if (isMark(m[r]?.[p.vCol])) qualifierPicks.push({ player: p.name, teamName });
    }
  }

  return { championPicks, qualifierPicks };
}

export function parseMainWorkbook(filePath: string): ParsedWorkbook {
  const wb = XLSX.readFile(filePath, { cellDates: true });

  // --- Players (Names sheet, column B, rows below the "Names" header) ---
  const names = toMatrix(wb.Sheets["Names"]);
  const players: string[] = [];
  for (let i = 1; i < names.length; i++) {
    const idx = names[i]?.[0];
    const name = names[i]?.[1];
    if (typeof name === "string" && name.trim() && typeof idx === "number") {
      players.push(name.trim());
    }
  }

  // --- Fixtures + teams (Group Stage sheet) ---
  const gs = toMatrix(wb.Sheets["Group Stage"]);
  const fixtures: ParsedFixture[] = [];
  const teamOrder: string[] = [];
  let matchNumber = 0;
  for (let i = 3; i < gs.length; i++) {
    const row = gs[i];
    const home = row?.[2];
    const away = row?.[3];
    if (typeof home !== "string" || typeof away !== "string" || !home.trim() || !away.trim()) {
      continue;
    }
    matchNumber += 1;
    const groupCode = GROUP_CODES[Math.floor((matchNumber - 1) / 6)] ?? "Z";
    fixtures.push({
      matchNumber,
      groupCode,
      homeTeam: home.trim(),
      awayTeam: away.trim(),
      scheduledAt: buildScheduledAt(row[0], row[1]),
    });
    if (!teamOrder.includes(home.trim())) teamOrder.push(home.trim());
    if (!teamOrder.includes(away.trim())) teamOrder.push(away.trim());
  }

  // Teams: derive group code from fixtures (each team appears in exactly one group).
  const teamGroup = new Map<string, string>();
  for (const f of fixtures) {
    if (!teamGroup.has(f.homeTeam)) teamGroup.set(f.homeTeam, f.groupCode);
    if (!teamGroup.has(f.awayTeam)) teamGroup.set(f.awayTeam, f.groupCode);
  }
  const teams = [...teamGroup.entries()].map(([name, groupCode]) => ({ name, groupCode }));

  // --- Player predictions (Group Stage player columns) ---
  // Header row 0: player names start at column index 8, every 4 columns.
  const header = gs[0] ?? [];
  const playerColumns: { player: string; col: number }[] = [];
  for (let c = 8; c < header.length; c += 4) {
    const p = header[c];
    if (typeof p === "string" && p.trim()) {
      playerColumns.push({ player: p.trim(), col: c });
    }
  }

  const predictions: ParsedPrediction[] = [];
  let mn = 0;
  for (let i = 3; i < gs.length; i++) {
    const row = gs[i];
    const home = row?.[2];
    const away = row?.[3];
    if (typeof home !== "string" || typeof away !== "string") continue;
    mn += 1;
    for (const { player, col } of playerColumns) {
      const h = num(row[col]);
      const a = num(row[col + 1]);
      if (h !== null && a !== null) {
        predictions.push({ player, matchNumber: mn, home: h, away: a });
      }
    }
  }

  // --- ToR defaults (entry fee + prize split) ---
  // The current workbook uses the standard split; parsing is best-effort with
  // a safe fallback to the documented defaults.
  const entryFee = 10000;
  const prizeSplit: Record<string, number> = {
    "1": 0.4,
    "2": 0.2,
    "3": 0.15,
    "4": 0.1,
    "5": 0.07,
    "6": 0.05,
    "7": 0.03,
  };

  const { championPicks, qualifierPicks } = parsePlayoffWinnerSheet(wb);

  return {
    players,
    teams,
    fixtures: applyOfficialKickoffs(fixtures),
    predictions,
    championPicks,
    qualifierPicks,
    entryFee,
    prizeSplit,
  };
}

export function defaultWorkbookPath(): string {
  return path.join(process.cwd(), "data", "2026-WC-database-group-scores.xlsx");
}
