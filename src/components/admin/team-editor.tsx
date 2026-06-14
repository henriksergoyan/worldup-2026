"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateTeam } from "@/app/actions/admin";
import { QualifiedToggle, ChampionButton } from "./toggles";
import { flagFor } from "@/lib/flags";

export interface TeamRow {
  id: string;
  name: string;
  groupCode: string | null;
  qualified: boolean;
  champion: boolean;
}

export function TeamEditorRow({ team }: { team: TeamRow }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [name, setName] = useState(team.name);
  const [group, setGroup] = useState(team.groupCode ?? "");
  const dirty = name !== team.name || group !== (team.groupCode ?? "");

  function save() {
    start(async () => {
      const res = await updateTeam(team.id, { name, groupCode: group || null });
      toast(res.message, res.ok ? "success" : "error");
    });
  }

  return (
    <div className="glass flex flex-wrap items-center gap-3 p-3">
      <span className="text-xl">{flagFor(team.name)}</span>
      <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-44" />
      <Input
        value={group}
        onChange={(e) => setGroup(e.target.value.toUpperCase())}
        className="h-9 w-16 text-center"
        placeholder="Grp"
        maxLength={3}
      />
      <div className="ml-auto flex items-center gap-2">
        <QualifiedToggle teamId={team.id} qualified={team.qualified} />
        <ChampionButton teamId={team.id} isChampion={team.champion} />
        <Button size="sm" variant="secondary" onClick={save} loading={pending} disabled={!dirty}>
          Save
        </Button>
      </div>
    </div>
  );
}
