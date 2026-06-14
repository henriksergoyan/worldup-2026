"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initial: AuthState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(signUp, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required placeholder="Henrik" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" placeholder="Sergoyan" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={6} required />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{state.error}</p>
      )}

      <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
        Create account
      </Button>

      <p className="text-center text-sm text-navy-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-pitch-300 hover:text-pitch-200">
          Sign in
        </Link>
      </p>
    </form>
  );
}
