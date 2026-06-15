"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Ակնարկ" },
  { href: "/admin/results", label: "Արդյունքներ" },
  { href: "/admin/users", label: "Մասնակիցներ" },
  { href: "/admin/teams", label: "Թիմեր" },
  { href: "/admin/fixtures", label: "Խաղացուցակ" },
  { href: "/admin/deadlines", label: "Ժամկետներ" },
  { href: "/admin/settings", label: "Կարգավորումներ" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] p-1.5">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition",
              active ? "bg-gold-500/20 text-gold-400" : "text-navy-300 hover:bg-white/5",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
