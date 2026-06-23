"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type HumorEpisode = {
  id: string;
  image: string;
  alt: string;
  marquee?: string;
  caption?: string;
  /** Styled like a classic Armenian song parody (e.g. «Գինի լից»). */
  songStyle?: boolean;
  containImage?: boolean;
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
    caption: "«Արի գլուխ գլուխի տանք, տեսնենք թե ում գլու՜ղն է պինդ» 🎵",
    songStyle: true,
  },
  {
    id: "flying",
    image: "/van-persie-flying.png",
    alt: "Թռչեի մտքով տուն",
    caption: "«Թռչեի մտքով տու՜ն, ուր Կաասիլյասն էր ապրու՜մ» 🎵",
    songStyle: true,
  },
  {
    id: "brazil",
    image: "/brazil-germany-7-1.png",
    alt: "Բրազիլիա 1–7 Գերմանիա",
    containImage: true,
    songStyle: true,
    caption:
      "«Պատմեմ ձեզ Սկոլարիի մահը, գոլեր լից,\nՄյուլլեռ ջան գոլեր լից, Júlio César անուշ-անուշ, խմողաց անուշ» 🎵",
  },
  {
    id: "messi-bisht",
    image: "/messi-bisht.png",
    alt: "Մեսսի՝ խալաթով",
    caption: "«Հաղթողին տրամադրում ենք այս խալաթը, артикул 1323343»",
  },
];

const ROTATE_MS = 9000;

function episodeLabel(ep: HumorEpisode): string {
  if (ep.marquee) return ep.marquee;
  return ep.caption?.replace(/\n/g, " ") ?? "";
}

export function LoginHumorGallery() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (EPISODES.length <= 1) return;
    const timer = window.setInterval(() => {
      setActive((i) => (i + 1) % EPISODES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">Հումորային դրվագներ</p>
        {EPISODES.length > 1 && (
          <div className="flex gap-1.5">
            {EPISODES.map((ep, i) => (
              <button
                key={ep.id}
                type="button"
                aria-label={`Դրվագ ${i + 1}`}
                onClick={() => setActive(i)}
                className={cn(
                  "h-2 w-2 rounded-full transition",
                  i === active ? "scale-110 bg-pitch-400" : "bg-white/20 hover:bg-white/35",
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-navy-950/40 p-1.5 shadow-2xl backdrop-blur-sm">
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
              <div
                className={cn(
                  "relative w-full bg-navy-900",
                  ep.containImage ? "aspect-[4/3]" : "aspect-[21/10]",
                )}
              >
                <Image
                  src={ep.image}
                  alt={ep.alt}
                  fill
                  className={cn(
                    ep.containImage ? "object-contain p-1" : "object-cover object-center",
                  )}
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
            ) : (
              <p
                className={cn(
                  "mt-2.5 whitespace-pre-line rounded-lg px-3 py-2.5 text-center text-sm font-bold leading-relaxed",
                  ep.songStyle
                    ? "border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-red-500/10 font-serif italic text-amber-100"
                    : "border border-pitch-500/25 bg-pitch-500/10 text-pitch-100",
                )}
              >
                {ep.caption}
              </p>
            )}
          </article>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {EPISODES.map((ep, i) => (
          <button
            key={`thumb-${ep.id}`}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-2 py-2 text-left transition",
              i === active
                ? "border-pitch-500/40 bg-pitch-500/10"
                : "border-white/10 bg-white/[0.03] hover:border-white/20",
            )}
          >
            <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md border border-white/10 bg-navy-900">
              <Image
                src={ep.image}
                alt=""
                fill
                className={cn(ep.containImage ? "object-contain p-0.5" : "object-cover object-center")}
                sizes="56px"
              />
            </div>
            <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-navy-200">
              {episodeLabel(ep)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
