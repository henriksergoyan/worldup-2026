"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type HumorEpisode = {
  id: string;
  image: string;
  alt: string;
  /** Wisdom quote — marquee, not a song. */
  marquee?: string;
  caption?: string;
  /** Armenian song parody styling. */
  songStyle?: boolean;
  /** Catalog / retail joke — purple styling. */
  retailStyle?: boolean;
};

const EPISODES: HumorEpisode[] = [
  {
    id: "biza",
    image: "/biza-marjan.png",
    alt: "Մի լսիր բիձուն, լսիր ինքդ քեզ",
    marquee: "« Մի լսիր բիձուն, լսիր ինքդ քեզ 🙏 »",
  },
  {
    id: "zidane",
    image: "/zidane-head.png",
    alt: "Արի գլուխ գլուխի տանք",
    caption: "«Արի գլուխ գլուխի տանք, տեսնենք թե ում գլու՜խն է պինդ»",
    songStyle: true,
  },
  {
    id: "flying",
    image: "/van-persie-flying.png",
    alt: "Թռչեի մտքով տուն",
    caption: "«Թռչեի մտքով տու՜ն, ուր Կաասիլյասն էր ապրու՜մ»",
    songStyle: true,
  },
  {
    id: "brazil",
    image: "/brazil-germany-7-1.png",
    alt: "Բրազիլիա 1–7 Գերմանիա",
    songStyle: true,
    caption:
      "«Պատմեմ ձեզ Սկոլարիի մահը, գոլեր լից,\nՄյուլլեռ ջան գոլեր լից, Júlio César անուշ-անուշ, խմողաց անուշ»",
  },
  {
    id: "tshabalala",
    image: "/tshabalala-goal.png",
    alt: "Շաբալալայի գոլ",
    caption: "«Շաբա դաբա դաշ դաշ, շաբա դաբա դաշ դաշ…»",
    songStyle: true,
  },
  {
    id: "messi-bisht",
    image: "/messi-bisht.png",
    alt: "Մեսսի՝ խալաթով",
    caption: "«Հաղթողին տրամադրում ենք այս խալաթը, артикул 1323343»",
    retailStyle: true,
  },
];

const ROTATE_MS = 9000;

function goTo(setActive: (fn: (i: number) => number) => void, delta: number) {
  setActive((i) => (i + delta + EPISODES.length) % EPISODES.length);
}

export function LoginHumorGallery() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (EPISODES.length <= 1) return;
    const timer = window.setInterval(() => {
      goTo(setActive, 1);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-navy-950/40 p-1.5 shadow-2xl backdrop-blur-sm">
        {EPISODES.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Նախորդ դրվագ"
              onClick={() => goTo(setActive, -1)}
              className="absolute left-3 top-[calc(50%-1.5rem)] z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-navy-950/80 text-white/80 shadow-lg backdrop-blur-sm transition hover:border-white/30 hover:bg-navy-900 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Հաջորդ դրվագ"
              onClick={() => goTo(setActive, 1)}
              className="absolute right-3 top-[calc(50%-1.5rem)] z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-navy-950/80 text-white/80 shadow-lg backdrop-blur-sm transition hover:border-white/30 hover:bg-navy-900 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {EPISODES.map((ep, i) => (
          <article
            key={ep.id}
            className={cn(
              "transition-all duration-500",
              i === active ? "relative opacity-100" : "pointer-events-none absolute inset-0 p-1.5 opacity-0",
            )}
            aria-hidden={i !== active}
          >
            <div className="overflow-hidden rounded-xl border border-white/5">
              <div className="relative aspect-[16/10] w-full bg-navy-900">
                <Image
                  src={ep.image}
                  alt={ep.alt}
                  fill
                  className="object-contain p-1"
                  sizes="(max-width: 768px) 100vw, 480px"
                  priority={i === 0}
                />
              </div>
            </div>

            {ep.marquee ? (
              <div className="relative mt-2.5 overflow-hidden rounded-lg border-y border-amber-500/20 bg-black/40 py-2">
                <div className="flex w-full whitespace-nowrap">
                  <div className="animate-wise-marquee text-xs font-serif font-black uppercase italic tracking-widest text-transparent bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-100 bg-clip-text drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">
                    {ep.marquee}
                  </div>
                </div>
              </div>
            ) : ep.songStyle ? (
              <div className="relative mt-2.5 overflow-hidden rounded-lg border border-amber-400/35 bg-gradient-to-br from-amber-500/25 via-orange-500/10 to-rose-500/20 px-4 py-3 shadow-[inset_0_1px_0_rgba(251,191,36,0.15)]">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -left-1 top-1/2 -translate-y-1/2 text-lg opacity-40"
                >
                  🎵
                </span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-1 top-1/2 -translate-y-1/2 text-lg opacity-40"
                >
                  🎶
                </span>
                <p className="whitespace-pre-line text-center font-serif text-sm font-bold italic leading-relaxed text-transparent bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-100 bg-clip-text drop-shadow-[0_0_20px_rgba(251,191,36,0.25)]">
                  {ep.caption}
                </p>
                <p
                  aria-hidden
                  className="mt-1.5 text-center text-[11px] tracking-[0.35em] text-amber-300/50"
                >
                  ♪ ♫ ♪
                </p>
              </div>
            ) : (
              <p
                className={cn(
                  "mt-2.5 whitespace-pre-line rounded-lg px-3 py-2.5 text-center text-sm font-bold leading-relaxed",
                  ep.retailStyle &&
                    "border border-violet-500/35 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 text-violet-100",
                )}
              >
                {ep.caption}
              </p>
            )}
          </article>
        ))}

        {EPISODES.length > 1 && (
          <p className="mt-2 text-center text-[11px] font-medium tabular-nums text-navy-500">
            {active + 1} / {EPISODES.length}
          </p>
        )}
      </div>

      {EPISODES.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {EPISODES.map((ep, i) => (
            <button
              key={`thumb-${ep.id}`}
              type="button"
              aria-label={`Դրվագ ${i + 1}`}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-lg border-2 transition",
                i === active
                  ? "border-pitch-400 ring-2 ring-pitch-400/30"
                  : "border-white/10 opacity-60 hover:border-white/25 hover:opacity-100",
              )}
            >
              <Image
                src={ep.image}
                alt=""
                fill
                className="object-contain bg-navy-900 p-0.5"
                sizes="72px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
