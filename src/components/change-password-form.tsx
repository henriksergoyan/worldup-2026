"use client";

import { useActionState } from "react";
import { changePassword, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initial: AuthState = {};

export function ChangePasswordForm({ username }: { username: string }) {
  const [state, formAction, pending] = useActionState(changePassword, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Գաղտնաբառի փոփոխություն</CardTitle>
        <p className="text-sm text-navy-300">
          Մուտքանունը՝ <span className="font-mono text-pitch-300">{username}</span>
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword">Ընթացիկ գաղտնաբառ</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">Նոր գաղտնաբառ</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
            <p className="text-xs text-navy-400">Առնվազն 6 նիշ</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Կրկնել նոր գաղտնաբառը</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          {state.error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="rounded-lg border border-pitch-500/30 bg-pitch-500/10 px-3 py-2 text-sm text-pitch-200">
              {state.success}
            </p>
          )}

          <div className="flex justify-end pt-1">
            <Button type="submit" loading={pending} className="min-w-[140px]">
              Պահպանել գաղտնաբառը
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
