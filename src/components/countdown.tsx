"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function formatCountdown(ms: number, endedLabel = "Locked"): string {
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

export function Countdown({
  target,
  className,
  endedLabel = "Locked",
  prefix = "",
}: {
  target: string | Date;
  className?: string;
  endedLabel?: string;
  prefix?: string;
}) {
  const targetMs = typeof target === "string" ? new Date(target).getTime() : target.getTime();
  const [label, setLabel] = useState(() => formatCountdown(targetMs - Date.now(), endedLabel));

  useEffect(() => {
    const tick = () => setLabel(formatCountdown(targetMs - Date.now(), endedLabel));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetMs, endedLabel]);

  return (
    <span className={cn("tabular-nums tracking-tight", className)}>
      {prefix}
      {label}
    </span>
  );
}
