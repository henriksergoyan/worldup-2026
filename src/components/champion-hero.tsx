import Link from "next/link";
import { flagFor } from "@/lib/flags";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ChampionHero({
  teamName,
  groupCode,
  championPoints,
  isActualChampion,
  hasPick,
}: {
  teamName: string | null;
  groupCode: string | null;
  championPoints: number;
  isActualChampion: boolean;
  hasPick: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold-500/30 bg-gradient-to-br from-gold-500/20 via-navy-900/80 to-navy-950 shadow-glow">
      <div className="pointer-events-none absolute -right-8 -top-8 text-[8rem] opacity-[0.07]">🏆</div>
      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-gold-500/30 bg-gold-500/10 text-4xl sm:h-20 sm:w-20 sm:text-5xl">
            {hasPick ? flagFor(teamName ?? "") : "🏆"}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-gold-400/90">Քո չեմպիոնը 🏆</div>
            {hasPick ? (
              <>
                <div className="mt-0.5 truncate font-display text-2xl font-black text-white sm:text-3xl">
                  {teamName}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {groupCode && (
                    <span className="text-sm text-navy-300">Խումբ {groupCode}</span>
                  )}
                  <Badge variant="muted">🔒 Կողպված է</Badge>
                  {isActualChampion && <Badge variant="success">Աշխարհի չեմպիոն ★</Badge>}
                  {championPoints > 0 && (
                    <Badge variant="gold">+{championPoints} միավոր</Badge>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="mt-0.5 font-display text-xl font-bold text-navy-200">Ընտրված չէ</div>
                <p className="mt-1 text-sm text-navy-400">Չեմպիոնի ընտրությունը կցուցադրվի այստեղ:</p>
              </>
            )}
          </div>
        </div>
        <Link href="/champion" className="shrink-0">
          <Button variant="outline" className="w-full border-gold-500/30 sm:w-auto">
            Տեսնել բոլորի ընտրությունները 🏆 →
          </Button>
        </Link>
      </div>
    </div>
  );
}
