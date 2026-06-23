import { cn } from "@/lib/utils";
import { flagFor, translateTeam } from "@/lib/flags";

export function TeamChip({
  name,
  seedLabel,
  align = "left",
  className,
}: {
  name?: string | null;
  seedLabel?: string | null;
  align?: "left" | "right";
  className?: string;
}) {
  const label = name ? translateTeam(name) : (seedLabel ?? "TBD");
  const flag = name ? flagFor(name) : "❓";
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
        className,
      )}
    >
      <span className="text-lg leading-none">{flag}</span>
      <span className={cn("truncate font-semibold", !name && "text-navy-400 italic")}>
        {label}
      </span>
    </span>
  );
}
