"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { updateUserProfile, generateUserPassword } from "@/app/actions/admin";
import { PaidToggle, ActiveToggle } from "./toggles";

export interface AdminUserRow {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: string;
  paid: boolean;
  active: boolean;
  plainPassword: string | null;
}

export function UserEditorRow({ user }: { user: AdminUserRow }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState(user.plainPassword ?? "");
  const dirty =
    firstName !== user.firstName || lastName !== user.lastName || email !== user.email;

  function saveProfile() {
    start(async () => {
      const res = await updateUserProfile(user.id, { firstName, lastName, email });
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

  return (
    <div className="glass space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={user.role === "ADMIN" ? "gold" : "muted"}>{user.role}</Badge>
        <span className="text-xs text-navy-400">{user.name}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-navy-400">First name</label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-9" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-navy-400">Last name</label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-9" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-navy-400">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="h-9" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-navy-900/50 px-3 py-2">
          <span className="text-xs text-navy-400">Password</span>
          <code className="font-mono text-sm font-bold text-gold-400">{password || "—"}</code>
        </div>
        <Button size="sm" variant="outline" onClick={resetPassword} loading={pending}>
          Generate new password
        </Button>
        <Button size="sm" variant="secondary" onClick={saveProfile} loading={pending} disabled={!dirty}>
          Save profile
        </Button>
        <PaidToggle userId={user.id} paid={user.paid} />
        <ActiveToggle userId={user.id} active={user.active} />
      </div>
    </div>
  );
}
