"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { buildUsername } from "@/lib/user-utils";

const initial: AuthState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(signUp, initial);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const previewUsername = useMemo(() => {
    if (!firstName.trim()) return "firstname.lastname";
    return buildUsername(firstName.trim(), lastName.trim());
  }, [firstName, lastName]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">Անուն (First name)</Label>
          <Input
            id="firstName"
            name="firstName"
            required
            placeholder="Henrik"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Ազգանուն (Last name)</Label>
          <Input
            id="lastName"
            name="lastName"
            placeholder="Sergoyan"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-navy-400">
        Քո մուտքանունը (username) կլինի՝ <span className="font-mono text-pitch-300">{previewUsername}</span>
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Գաղտնաբառ (Password)</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={6} required />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{state.error}</p>
      )}

      <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
        Գրանցվել 🚀
      </Button>

      <p className="text-center text-sm text-navy-400">
        Արդեն ունե՞ս ակաունտ:{" "}
        <Link href="/login" className="font-semibold text-pitch-300 hover:text-pitch-200">
          Մուտք գործիր
        </Link>
      </p>
    </form>
  );
}
