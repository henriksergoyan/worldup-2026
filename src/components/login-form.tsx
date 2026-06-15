"use client";

import { useActionState, useState } from "react";
import { signIn, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { JoinLeagueModal } from "@/components/join-league-modal";

const initial: AuthState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initial);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">Մուտքանուն</Label>
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="firstname.lastname"
            defaultValue=""
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Գաղտնաբառ</Label>
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
          {pending ? "Մուտք ենք գործում..." : "Մուտք գործել"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full text-sm text-navy-300 hover:text-pitch-200"
          onClick={() => setContactOpen(true)}
        >
          Ուզու՞մ ես միանալ մեր լիգային կամ հարցեր ունե՞ս: 🤔
        </Button>
      </form>

      <JoinLeagueModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}
