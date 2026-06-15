"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createUser } from "@/app/actions/admin";
import { buildUsername } from "@/lib/user-utils";

export function AddUserForm() {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const previewUsername = firstName.trim()
    ? buildUsername(firstName.trim(), lastName.trim())
    : "anun.azganun";

  function submit() {
    start(async () => {
      const res = await createUser({ firstName, lastName });
      if (res.ok && res.username && res.password) {
        toast(`${res.message} Գաղտնաբառ՝ ${res.password}`, "success");
        setFirstName("");
        setLastName("");
      } else {
        toast(res.message, res.ok ? "success" : "error");
      }
    });
  }

  return (
    <div className="glass space-y-3 p-4">
      <h3 className="font-display text-lg font-bold text-white">Մասնակից ավելացնել</h3>
      <p className="text-xs text-navy-400">
        Ստեղծվում է մուտք <span className="font-mono text-pitch-300">{previewUsername}</span> ավտոմատ գեներացված
        գաղտնաբառով։ Ինքներդ խաղալու համար ավելացրեք առանձին խաղացողի պրոֆիլ։
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-navy-400">Անուն</label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-9" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-navy-400">Ազգանուն</label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-9" />
        </div>
      </div>
      <Button onClick={submit} loading={pending} disabled={!firstName.trim()}>
        Ստեղծել
      </Button>
    </div>
  );
}
