import { cn } from "@/lib/utils";
import { visibleKnockoutExtras, type KnockoutDisplayScore } from "@/lib/scoring";

const ET_LABEL = "Լժ";
const PEN_LABEL = "11մ";

function ScoreLine({
  home,
  away,
  label,
  size,
  muted,
}: {
  home: number;
  away: number;
  label?: string;
  size: "sm" | "lg";
  muted?: boolean;
}) {
  const text = size === "lg" ? "text-2xl sm:text-3xl" : "text-sm";
  const labelCls = size === "lg" ? "text-[10px]" : "text-[9px]";
  return (
    <div className={cn("flex flex-col items-center gap-0.5", muted && "opacity-70")}>
      {label && (
        <span className={cn("font-bold uppercase tracking-wider text-navy-500", labelCls)}>
          {label}
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <span className={cn("font-black tabular-nums text-white", text)}>{home}</span>
        <span className={cn("font-bold text-navy-500", size === "lg" ? "text-lg" : "text-xs")}>:</span>
        <span className={cn("font-black tabular-nums text-white", text)}>{away}</span>
      </div>
    </div>
  );
}

/** Present a knockout score with optional extra-time and penalty lines. */
export function KnockoutScoreDisplay({
  score,
  size = "lg",
  muted = false,
  className,
}: {
  score: KnockoutDisplayScore;
  size?: "sm" | "lg";
  muted?: boolean;
  className?: string;
}) {
  if (score.normalHome === null || score.normalAway === null) {
    return <span className="text-navy-500">—</span>;
  }

  const { extra, penalty } = visibleKnockoutExtras(score);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <ScoreLine
        home={score.normalHome}
        away={score.normalAway}
        size={size}
        muted={muted}
      />
      {extra && (
        <ScoreLine home={extra.home} away={extra.away} label={ET_LABEL} size={size} muted={muted} />
      )}
      {penalty && (
        <ScoreLine home={penalty.home} away={penalty.away} label={PEN_LABEL} size={size} muted={muted} />
      )}
    </div>
  );
}

/** Compact inline text, e.g. `1–1 (0–0, 4–3p)`. */
export function formatKnockoutScoreInline(score: KnockoutDisplayScore): string {
  if (score.normalHome === null || score.normalAway === null) return "—";
  const { extra, penalty } = visibleKnockoutExtras(score);
  let s = `${score.normalHome}–${score.normalAway}`;
  if (extra) s += ` (${extra.home}–${extra.away})`;
  if (penalty) s += ` ${penalty.home}–${penalty.away}p`;
  return s;
}

export function KnockoutScorePill({
  score,
  highlight,
}: {
  score: KnockoutDisplayScore;
  highlight?: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums",
        highlight ? "bg-gold-500/20 text-gold-300 ring-1 ring-gold-500/40" : "bg-navy-900 text-white",
      )}
    >
      {formatKnockoutScoreInline(score)}
    </span>
  );
}
