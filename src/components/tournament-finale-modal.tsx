"use client";

import { useState } from "react";
import Image from "next/image";
import { cn, formatAMD } from "@/lib/utils";
import { flagFor, translateTeam } from "@/lib/flags";
import { Button } from "@/components/ui/button";

export function TournamentFinaleModal({
  championName,
  rank,
  prizeAmount,
  playerName,
}: {
  championName: string;
  rank: number;
  prizeAmount: number;
  playerName: string;
}) {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  const wonMoney = prizeAmount > 0;
  const firstName = playerName.trim().split(/\s+/)[0] || playerName;
  const prizeLabel = formatAMD(prizeAmount).replace(" AMD", "");

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
          <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-[#08080c]/50 to-transparent" />
        </div>

        <div className="relative flex flex-col items-center px-6 pb-6 pt-2 text-center">
          {wonMoney ? (
            <>
              <p id="finale-title" className="font-display text-2xl font-black text-white sm:text-3xl">
                Շնորհավորում ենք, {firstName}! 🎉
              </p>
              <p className="mt-3 font-display text-xl font-bold text-gold-400 sm:text-2xl">
                Դուք հաղթեցիք {prizeLabel} դրամ
              </p>
              <p className="mt-2 text-sm text-white/55">
                Վերջնական դիրք՝ <span className="font-bold text-white">#{rank}</span>
              </p>
            </>
          ) : (
            <>
              <p id="finale-title" className="font-display text-2xl font-black text-white sm:text-3xl">
                Էս անգամ չստացվեց….
              </p>
              <p className="mt-3 text-base text-white/70">
                Մրցանակային տեղում չեք · վերջնական դիրք՝{" "}
                <span className="font-display text-2xl font-black text-white">#{rank}</span>
              </p>
            </>
          )}

          <p className="mt-5 text-xs text-white/40">
            Աշխարհի չեմպիոն՝ {flagFor(championName)} {translateTeam(championName)}
          </p>

          <Button onClick={() => setOpen(false)} className="mt-6 w-full" size="lg">
            Շարունակել ⚽
          </Button>
        </div>
      </div>
    </div>
  );
}
