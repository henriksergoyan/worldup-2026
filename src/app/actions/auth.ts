"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, verifyPassword, hashPassword } from "@/lib/auth";
import { getActiveTournament } from "@/lib/standings";
import { buildUsername, formatUserName, uniqueUsername } from "@/lib/user-utils";
import type { Role } from "@/lib/constants";

const loginSchema = z.object({
  username: z.string().min(3, "Enter your username"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(40),
  lastName: z.string().max(40).optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export interface AuthState {
  error?: string;
  success?: string;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const username = parsed.data.username.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.active) {
    return { error: "Invalid username or password" };
  }
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return { error: "Invalid username or password" };
  }

  await createSession({ userId: user.id, role: user.role as Role, name: user.name });
  redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || "",
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tournament = await getActiveTournament().catch(() => null);
  if (tournament && !tournament.registrationOpen) {
    return { error: "Registration is currently closed. Ask the admin to add you." };
  }

  const firstName = parsed.data.firstName.trim();
  const lastName = (parsed.data.lastName ?? "").trim();
  const name = formatUserName({ firstName, lastName });
  const username = buildUsername(firstName, lastName);
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return { error: "That username is already taken." };

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      name,
      username,
      passwordHash,
      plainPassword: parsed.data.password,
      role: "PLAYER",
      paid: false,
      active: true,
    },
  });

  await createSession({ userId: user.id, role: "PLAYER", name: user.name });
  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/login");
}
