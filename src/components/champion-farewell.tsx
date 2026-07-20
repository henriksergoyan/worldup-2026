"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { flagFor, translateTeam } from "@/lib/flags";
import { POINTS } from "@/lib/constants";
import type { ChampionPickRow } from "@/lib/champion-picks";

export function ChampionFarewell({
  picks,
  actualChampionId,
  actualChampionName,
  compact = false,
}: {
  picks: ChampionPickRow[];
  actualChampionId: string;
  actualChampionName: string;
  compact?: boolean;
}) {
  const winners = picks
    .filter((p) => p.teamId === actualChampionId)
    .sort((a, b) => a.name.localeCompare(b.name, "hy"));
  const others = picks
    .filter((p) => p.teamId !== actualChampionId)
    .sort((a, b) => a.name.localeCompare(b.name, "hy"));

  const me = picks.find((p) => p.isMe);
  const iWon = me?.teamId === actualChampionId;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border",
        "bg-[#050508]",
        iWon ? "border-emerald-500/35" : me ? "border-rose-500/30" : "border-white/10",
        compact ? "p-5 sm:p-6" : "p-6 sm:p-10",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 20% 0%, rgba(236, 72, 153, 0.22), transparent 55%),
            radial-gradient(ellipse 60% 50% at 85% 15%, rgba(56, 189, 248, 0.18), transparent 50%),
            radial-gradient(ellipse 50% 40% at 50% 100%, rgba(132, 204, 22, 0.14), transparent 55%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl"
      />

      <div className="relative flex flex-col items-center text-center">
        <div
          className={cn(
            "animate-fade-in",
            compact ? "mb-4 w-36 sm:w-44" : "mb-6 w-48 sm:w-56 md:w-64",
          )}
        >
          <Image
            src="/euro-2028-logo.png"
            alt="UEFA EURO 2028 — UK & Ireland"
            width={512}
            height={512}
            className="h-auto w-full drop-shadow-[0_12px_40px_rgba(236,72,153,0.25)]"
            priority
          />
        </div>

        <p
          className={cn(
            "animate-fade-in font-display font-black tracking-tight text-white",
            compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl md:text-5xl",
          )}
          style={{ animationDelay: "80ms" }}
        >
          Կտեսնվենք Euro 2028-ին
        </p>

        <p
          className="animate-fade-in mt-3 max-w-lg text-sm text-white/60 sm:text-base"
          style={{ animationDelay: "140ms" }}
        >
          Աշխարհի չեմպիոն՝{" "}
          <span className="font-semibold text-white">
            {flagFor(actualChampionName)} {translateTeam(actualChampionName)}
          </span>
        </p>

        {me && (
          <div
            className={cn(
              "animate-fade-in mt-5 inline-flex max-w-md flex-col items-center gap-1.5 rounded-2xl px-5 py-3.5",
              iWon
                ? "bg-emerald-500/20 ring-2 ring-emerald-400/50"
                : "bg-rose-500/20 ring-2 ring-rose-400/45",
            )}
            style={{ animationDelay: "200ms" }}
          >
            {iWon ? (
              <>
                <span className="text-base font-bold text-emerald-300">
                  ✓ Ճիշտ գուշակեցիր չեմպիոնին · +{POINTS.CHAMPION} միավոր
                </span>
                <span className="text-xs text-emerald-200/70">
                  Քո ընտրությունը՝ {flagFor(me.teamName)} {translateTeam(me.teamName)}
                </span>
              </>
            ) : (
              <>
                <span className="text-base font-bold text-rose-300">
                  ✗ Այս անգամ չստացվեց չեմպիոնի գուշակումը
                </span>
                <span className="text-xs text-rose-200/70">
                  Դու ընտրել էիր {flagFor(me.teamName)} {translateTeam(me.teamName)}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {!compact && (
        <div
          className="animate-fade-in relative mt-10 grid gap-6 sm:grid-cols-2"
          style={{ animationDelay: "260ms" }}
        >
          <PickColumn
            title="Ճիշտ գուշակածներ"
            accent="lime"
            empty="Ոչ ոք չգուշակեց չեմպիոնին"
            picks={winners}
            showTeam={false}
          />
          <PickColumn
            title="Այլ ընտրություններ"
            accent="rose"
            empty="Բոլորը ճիշտ էին"
            picks={others}
            showTeam
          />
        </div>
      )}

      {compact && (
        <div
          className="animate-fade-in relative mt-6 flex flex-col items-center gap-3"
          style={{ animationDelay: "260ms" }}
        >
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-white/45">
            <span>
              <span className="font-semibold text-emerald-300">{winners.length}</span> ճիշտ
            </span>
            <span className="text-white/20">·</span>
            <span>
              <span className="font-semibold text-rose-300">{others.length}</span> այլ ընտրություն
            </span>
          </div>
          <Link
            href="/champion"
            className="text-sm font-medium text-sky-300 underline-offset-4 hover:underline"
          >
            Տեսնել բոլորի ընտրությունները →
          </Link>
        </div>
      )}
    </section>
  );
}

function PickColumn({
  title,
  accent,
  empty,
  picks,
  showTeam,
}: {
  title: string;
  accent: "lime" | "rose";
  empty: string;
  picks: ChampionPickRow[];
  showTeam: boolean;
}) {
  const titleColor = accent === "lime" ? "text-emerald-300" : "text-rose-300";
  const bar =
    accent === "lime"
      ? "from-emerald-400/80 to-sky-400/60"
      : "from-rose-400/80 to-fuchsia-400/40";

  return (
    <div className="text-left">
      <div className="mb-3 flex items-center gap-3">
        <h3 className={cn("font-display text-sm font-bold uppercase tracking-wider", titleColor)}>
          {title}
        </h3>
        <div className={cn("h-px flex-1 bg-gradient-to-r opacity-60", bar)} />
        <span className="tabular-nums text-xs text-white/40">{picks.length}</span>
      </div>
      {picks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/35">
          {empty}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {picks.map((p, i) => (
            <li
              key={p.userId}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition",
                p.isMe
                  ? accent === "lime"
                    ? "bg-emerald-500/15 ring-1 ring-emerald-400/40"
                    : "bg-rose-500/15 ring-1 ring-rose-400/40"
                  : "bg-white/[0.03] hover:bg-white/[0.06]",
              )}
              style={{ animationDelay: `${280 + i * 30}ms` }}
            >
              <span className="truncate font-medium text-white">
                {p.name}
                {p.isMe && <span className="ml-1.5 text-xs text-white/40">(դու)</span>}
              </span>
              {showTeam && (
                <span className="shrink-0 text-xs text-white/50">
                  {flagFor(p.teamName)} {translateTeam(p.teamName)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
