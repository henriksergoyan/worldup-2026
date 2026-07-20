import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { ROLES, DEFAULT_TIMEZONE, type Role } from "./constants";
import { yerevanLocalToUtc } from "./excel-deadlines";

const COOKIE_NAME = "wc_session";

/** Session ends at the next midnight in the league timezone (daily re-login). */
function sessionExpiresAt(from: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(from);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return yerevanLocalToUtc(get("year"), get("month"), get("day") + 1, 0, 0);
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 8) {
    throw new Error("AUTH_SECRET is not set. Copy .env.example to .env.");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface SessionPayload {
  userId: string;
  role: Role;
  name: string;
  [key: string]: unknown;
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const expiresAt = sessionExpiresAt();
  const maxAgeSeconds = Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export interface CurrentUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  paid: boolean;
  active: boolean;
}

/** Returns the logged-in user (validated against the DB) or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await readSession();
  if (!session?.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, username: true, role: true, paid: true, active: true },
  });
  if (!user || !user.active) return null;
  return user as CurrentUser;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== ROLES.ADMIN) throw new Error("FORBIDDEN");
  return user;
}
