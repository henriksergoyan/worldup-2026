"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createKnockoutMatch } from "@/app/actions/admin";
import { ROUNDS, ROUND_LABELS, type Round } from "@/lib/constants";

export function CreateKoMatch({ teams }: { teams: { id: string; name: string }[] }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [round, setRound] = useState<Round>("R32");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [homeSeedLabel, setHomeSeedLabel] = useState("");
  const [awaySeedLabel, setAwaySeedLabel] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  function submit() {
    start(async () => {
      const res = await createKnockoutMatch({
        round,
        homeTeamId: homeTeamId || null,
        awayTeamId: awayTeamId || null,
        homeSeedLabel: homeSeedLabel || null,
        awaySeedLabel: awaySeedLabel || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
      });
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) {
        setHomeSeedLabel("");
        setAwaySeedLabel("");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Փլեյ-օֆ խաղ ավելացնել</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Փուլ</Label>
          <Select value={round} onChange={(e) => setRound(e.target.value as Round)}>
            {ROUNDS.map((r) => (
              <option key={r} value={r}>
                {ROUND_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Խաղի սկիզբ</Label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-navy-900/70 px-3 text-sm text-white outline-none focus:border-pitch-400"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Տան թիմ</Label>
          <Select value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)}>
            <option value="">— Դեռ չի որոշվել —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Տան թիմի նշան (օր.՝ 1A)"
            value={homeSeedLabel}
            onChange={(e) => setHomeSeedLabel(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Հյուր թիմ</Label>
          <Select value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)}>
            <option value="">— Դեռ չի որոշվել —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Հյուր թիմի նշան (օր.՝ 2B)"
            value={awaySeedLabel}
            onChange={(e) => setAwaySeedLabel(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Button onClick={submit} loading={pending}>
            Ստեղծել
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
