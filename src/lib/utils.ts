import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DEFAULT_TIMEZONE, TIMEZONE_LABEL } from "./constants";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatAMD(amount: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(amount)) + " AMD";
}

const dtf = new Intl.DateTimeFormat("en-GB", {
  timeZone: DEFAULT_TIMEZONE,
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "TBD";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${dtf.format(d)} · ${TIMEZONE_LABEL}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
