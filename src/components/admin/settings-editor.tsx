"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateSettings } from "@/app/actions/admin";
import { formatAMD } from "@/lib/utils";

export function SettingsEditor({
  entryFee,
  knockoutPickCount,
  kickoffLockMinutes,
  registrationOpen,
  prizeSplit,
  paidCount,
}: {
  entryFee: number;
  knockoutPickCount: number;
  kickoffLockMinutes: number;
  registrationOpen: boolean;
  prizeSplit: Record<string, number>;
  paidCount: number;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [fee, setFee] = useState(String(entryFee));
  const [pickCount, setPickCount] = useState(String(knockoutPickCount));
  const [lockMins, setLockMins] = useState(String(kickoffLockMinutes));
  const [regOpen, setRegOpen] = useState(registrationOpen);
  const [splits, setSplits] = useState<Record<string, string>>(() => {
    const s: Record<string, string> = {};
    for (let r = 1; r <= 7; r++) s[String(r)] = String(((prizeSplit[String(r)] ?? 0) * 100).toFixed(0));
    return s;
  });

  const pool = Number(fee || 0) * paidCount;
  const totalPct = Object.values(splits).reduce((a, b) => a + Number(b || 0), 0);

  function save() {
    const prize: Record<string, number> = {};
    for (const [r, v] of Object.entries(splits)) {
      const frac = Number(v || 0) / 100;
      if (frac > 0) prize[r] = frac;
    }
    start(async () => {
      const res = await updateSettings({
        entryFee: Number(fee || 0),
        knockoutPickCount: Number(pickCount || 1),
        kickoffLockMinutes: Number(lockMins || 60),
        registrationOpen: regOpen,
        prizeSplit: prize,
      });
      toast(res.message, res.ok ? "success" : "error");
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Մրցաշարի կարգավորումներ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <Label>Մասնակցության վարձ (դրամ)</Label>
            <Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Փլեյ-օֆ թիմերի ընտրություններ մեկ խաղացողի համար</Label>
            <Input type="number" value={pickCount} onChange={(e) => setPickCount(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Կանխատեսման փակում (րոպե մինչև խաղի սկիզբը)</Label>
            <Input type="number" value={lockMins} onChange={(e) => setLockMins(e.target.value)} />
            <p className="text-xs text-navy-400">
              Խաղացողները կարող են խմբագրել կանխատեսումները մինչև խաղի սկիզբից այսքան րոպե առաջ (լռելյայն՝ 60)։
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-navy-200">
            <input
              type="checkbox"
              checked={regOpen}
              onChange={(e) => setRegOpen(e.target.checked)}
              className="h-4 w-4 accent-pitch-500"
            />
            Թույլատրել ինքնուրույն գրանցումը /register էջում
          </label>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="text-xs uppercase tracking-wide text-navy-400">Կանխատեսվող մրցանակային ֆոնդ</div>
            <div className="mt-1 text-2xl font-black text-gold-400">{formatAMD(pool)}</div>
            <div className="text-xs text-navy-400">
              {paidCount} վճարած × {formatAMD(Number(fee || 0))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Մրցանակների բաշխում (%)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((r) => {
            const pct = Number(splits[String(r)] || 0);
            return (
              <div key={r} className="flex items-center gap-3">
                <span className="w-16 text-sm font-semibold text-navy-200">{r}-ին տեղ</span>
                <Input
                  type="number"
                  value={splits[String(r)]}
                  onChange={(e) => setSplits((s) => ({ ...s, [String(r)]: e.target.value }))}
                  className="h-9 w-24"
                />
                <span className="text-sm text-navy-400">{formatAMD((pct / 100) * pool)}</span>
              </div>
            );
          })}
          <div className={`text-sm font-semibold ${totalPct === 100 ? "text-pitch-300" : "text-amber-300"}`}>
            Ընդամենը՝ {totalPct}% {totalPct !== 100 && "(պետք է լինի 100%)"}
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <Button onClick={save} loading={pending}>
          Պահպանել
        </Button>
      </div>
    </div>
  );
}
