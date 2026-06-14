import NextLink from "next/link";
import { cn } from "@/lib/utils";

export function CrowdArenaLink({
  matchId,
  className,
  compact = false,
}: {
  matchId: string;
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <NextLink
        href={`/matches/${matchId}`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border-2 border-pitch-500/50 bg-pitch-500/20 px-3 py-1.5 text-xs font-bold text-pitch-100 shadow-glow transition hover:border-pitch-400 hover:bg-pitch-500/30",
          className,
        )}
      >
        <span aria-hidden>👥</span> Խաղի կենտրոն
      </NextLink>
    );
  }

  return (
    <NextLink
      href={`/matches/${matchId}`}
      className={cn(
        "group flex shrink-0 flex-col items-center justify-center rounded-xl border-2 border-pitch-500/45 bg-gradient-to-br from-pitch-600/25 to-pitch-500/10 px-4 py-2.5 text-center shadow-glow transition hover:border-pitch-400 hover:from-pitch-500/35 hover:to-pitch-400/15",
        className,
      )}
    >
      <span className="text-2xl leading-none" aria-hidden>
        👥
      </span>
      <span className="mt-1 font-display text-sm font-bold text-pitch-100 group-hover:text-white">
        Խաղի կենտրոն
      </span>
      <span className="text-[10px] font-medium text-pitch-300/90">Բոլոր կանխատեսումները</span>
    </NextLink>
  );
}
