"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function formatCountdownFull(ms: number, endedLabel = "Locked"): string {
  if (ms <= 0) return endedLabel;
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours > 0 || days > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  parts.push(`${seconds} ${seconds === 1 ? "second" : "seconds"}`);

  return parts.join(", ");
}

export function formatDaysRemaining(ms: number, endedLabel = "Locked"): string {
  if (ms <= 0) return endedLabel;
  const days = Math.ceil(ms / 86400000);
  if (days <= 1) return "1 day";
  return `${days} days`;
}

export function Countdown({
  target,
  className,
  endedLabel = "Locked",
  prefix = "",
  mode = "full",
}: {
  target: string | Date;
  className?: string;
  endedLabel?: string;
  prefix?: string;
  mode?: "full" | "days";
}) {
  const targetMs = typeof target === "string" ? new Date(target).getTime() : target.getTime();
  const [label, setLabel] = useState(() => {
    const remaining = targetMs - Date.now();
    return mode === "days"
      ? formatDaysRemaining(remaining, endedLabel)
      : formatCountdownFull(remaining, endedLabel);
  });

  useEffect(() => {
    const tick = () => {
      const remaining = targetMs - Date.now();
      setLabel(
        mode === "days"
          ? formatDaysRemaining(remaining, endedLabel)
          : formatCountdownFull(remaining, endedLabel),
      );
    };
    tick();
    const intervalMs = mode === "days" ? 60_000 : 1000;
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [targetMs, endedLabel, mode]);

  return (
    <span className={cn("tabular-nums tracking-tight", className)}>
      {prefix}
      {label}
    </span>
  );
}
