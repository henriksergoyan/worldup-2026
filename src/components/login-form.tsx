"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initial: AuthState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue=""
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
        {pending ? "Signing in..." : "Sign in"}
      </Button>

      <p className="text-center text-sm text-navy-400">
        New here?{" "}
        <a href="/register" className="font-semibold text-pitch-300 hover:text-pitch-200">
          Create an account
        </a>
      </p>
    </form>
  );
}
