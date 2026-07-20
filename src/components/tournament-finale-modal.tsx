"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn, formatAMD } from "@/lib/utils";
import { flagFor, translateTeam } from "@/lib/flags";
import { Button } from "@/components/ui/button";
import { POINTS } from "@/lib/constants";

export function TournamentFinaleModal({
  tournamentId,
  championName,
  myPickName,
  championCorrect,
  championPoints,
  rank,
  prizeAmount,
  playerName,
}: {
  tournamentId: string;
  championName: string;
  myPickName: string | null;
  championCorrect: boolean;
  championPoints: number;
  rank: number;
  prizeAmount: number;
  playerName: string;
}) {
  const storageKey = `wc2026-finale-v2-${tournamentId}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) === "1") return;
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [storageKey]);

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  const wonMoney = prizeAmount > 0;
  const firstName = playerName.trim().split(/\s+/)[0] || playerName;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 p-3 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finale-title"
    >
      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl",
          wonMoney ? "border-gold-500/45 bg-[#08080c]" : "border-white/15 bg-[#08080c]",
        )}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-navy-900">
          <Image
            src={wonMoney ? "/finale-won.png" : "/finale-lost.png"}
            alt=""
            fill
            className="object-cover object-center"
            sizes="(max-width: 448px) 100vw, 448px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-[#08080c]/40 to-transparent" />
        </div>

        <div className="relative flex flex-col items-center px-6 pb-6 pt-2 text-center">
          <p id="finale-title" className="font-display text-2xl font-black text-white sm:text-3xl">
            {wonMoney ? (
              <>Շնորհավորում ենք, {firstName}! 🎉</>
            ) : (
              <>Էս անգամ չստացվեց….</>
            )}
          </p>

          {wonMoney ? (
            <p className="mt-3 font-display text-xl font-bold text-gold-400 sm:text-2xl">
              Դուք հաղթեցիք {formatAMD(prizeAmount).replace(" AMD", "")} դրամ
            </p>
          ) : (
            <p className="mt-3 text-base text-white/70">
              Ձեր վերջնական դիրքը՝{" "}
              <span className="font-display text-2xl font-black text-white">#{rank}</span>
            </p>
          )}

          <div className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-white/45">Աշխարհի չեմպիոն</p>
            <p className="mt-1 text-lg font-bold text-white">
              {flagFor(championName)} {translateTeam(championName)}
            </p>
            {myPickName && (
              <p
                className={cn(
                  "mt-2 rounded-xl px-3 py-2 text-sm font-semibold",
                  championCorrect
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40"
                    : "bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/40",
                )}
              >
                {championCorrect
                  ? `✓ Ճիշտ գուշակեցիր · +${championPoints || POINTS.CHAMPION} միավոր`
                  : `✗ Քո ընտրությունը՝ ${flagFor(myPickName)} ${translateTeam(myPickName)}`}
              </p>
            )}
          </div>

          <Button onClick={dismiss} className="mt-6 w-full" size="lg">
            Շարունակել ⚽
          </Button>
        </div>
      </div>
    </div>
  );
}
