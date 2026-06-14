"use client";

import { cn } from "@/lib/utils";

export function ScoreInput({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={99}
      aria-label={ariaLabel}
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") return onChange(null);
        const n = Math.max(0, Math.min(99, Math.floor(Number(raw))));
        onChange(Number.isNaN(n) ? null : n);
      }}
      className={cn("score-box")}
    />
  );
}
