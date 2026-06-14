/** Split a display name into first and last name (best-effort). */
export function splitDisplayName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim();
  if (!trimmed) return { firstName: "Player", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export const USER_EMAIL_DOMAIN = "example.com";

function slugPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** Login email as firstname.lastname@domain (e.g. henrik.smith@example.com). */
export function buildUserEmail(firstName: string, lastName: string, domain = USER_EMAIL_DOMAIN): string {
  const first = slugPart(firstName) || "player";
  const last = slugPart(lastName);
  return last ? `${first}.${last}@${domain}` : `${first}@${domain}`;
}

export function formatUserName(u: { firstName?: string | null; lastName?: string | null; name?: string }): string {
  const first = u.firstName?.trim();
  const last = u.lastName?.trim();
  if (first) return last ? `${first} ${last}` : first;
  return u.name?.trim() ?? "Player";
}

export function userInitials(u: { firstName?: string | null; lastName?: string | null; name?: string }): string {
  const first = u.firstName?.trim() || u.name?.trim().split(/\s+/)[0] || "?";
  const last = u.lastName?.trim() || u.name?.trim().split(/\s+/)[1] || "";
  if (last) return (first[0] + last[0]).toUpperCase();
  return first.slice(0, 2).toUpperCase();
}

/** Generate a readable random password for admin resets. */
export function generateReadablePassword(): string {
  const words = ["goal", "pitch", "cup", "star", "kick", "net", "win", "team"];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${w}${n}`;
}

/** Resolve workbook player label to a user record by display name. */
export function matchPlayerName<T extends { name: string }>(label: string, users: T[]): T | undefined {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const key = norm(label);
  return users.find((u) => norm(u.name) === key);
}
