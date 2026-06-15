"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { updateUserProfile, generateUserPassword, deleteUser } from "@/app/actions/admin";
import { PaidToggle, ActiveToggle } from "./toggles";
import { buildUsername } from "@/lib/user-utils";

export interface AdminUserRow {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  username: string;
  role: string;
  paid: boolean;
  active: boolean;
  plainPassword: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Ադմին",
  PLAYER: "Մասնակից",
};

export function UserEditorRow({ user }: { user: AdminUserRow }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [password, setPassword] = useState(user.plainPassword ?? "");
  const dirty = firstName !== user.firstName || lastName !== user.lastName;
  const previewUsername = buildUsername(firstName.trim() || "player", lastName.trim());

  function saveProfile() {
    start(async () => {
      const res = await updateUserProfile(user.id, { firstName, lastName });
      toast(res.message, res.ok ? "success" : "error");
    });
  }

  function resetPassword() {
    start(async () => {
      const res = await generateUserPassword(user.id);
      if (res.password) setPassword(res.password);
      toast(res.message, res.ok ? "success" : "error");
    });
  }

  function remove() {
    if (!window.confirm(`${user.name}-ին հեռացնե՞լ։ Գործողությունը հետարկելի չէ։`)) return;
    start(async () => {
      const res = await deleteUser(user.id);
      toast(res.message, res.ok ? "success" : "error");
    });
  }

  return (
    <div className="glass space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={user.role === "ADMIN" ? "gold" : "muted"}>{ROLE_LABELS[user.role] ?? user.role}</Badge>
          <span className="text-xs text-navy-400">{user.name}</span>
        </div>
        {user.role !== "ADMIN" && (
          <Button size="sm" variant="danger" onClick={remove} loading={pending}>
            Հեռացնել
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-navy-400">Անուն</label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-9" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-navy-400">Ազգանուն</label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-9" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-navy-400">Օգտանուն</label>
          <div className="rounded-xl border border-white/10 bg-navy-900/50 px-3 py-2 font-mono text-sm text-pitch-200">
            {dirty ? previewUsername : user.username}
            {dirty && <span className="ml-2 text-xs text-amber-400">պահպանելուց հետո կթարմացվի</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-navy-900/50 px-3 py-2">
          <span className="text-xs text-navy-400">Գաղտնաբառ</span>
          <code className="font-mono text-sm font-bold text-gold-400">{password || "—"}</code>
        </div>
        <Button size="sm" variant="outline" onClick={resetPassword} loading={pending}>
          Նոր գաղտնաբառ
        </Button>
        <Button size="sm" variant="secondary" onClick={saveProfile} loading={pending} disabled={!dirty}>
          Պահպանել
        </Button>
        <PaidToggle userId={user.id} paid={user.paid} />
        <ActiveToggle userId={user.id} active={user.active} />
      </div>
    </div>
  );
}
