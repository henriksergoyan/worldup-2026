"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn, initials } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import { Badge } from "@/components/ui/badge";

interface NavLink {
  href: string;
  label: string;
}

export function NavBar({
  user,
}: {
  user: { name: string; role: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = user.role === "ADMIN";

  const links: NavLink[] = isAdmin
    ? [
        { href: "/admin", label: "Admin" },
        { href: "/leaderboard", label: "Leaderboard" },
      ]
    : [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/predictions", label: "My Predictions" },
        { href: "/leaderboard", label: "Leaderboard" },
      ];

  const homeHref = isAdmin ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href={homeHref} className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-display text-lg font-black tracking-tight text-white">
            WC<span className="text-pitch-400">26</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-pitch-500/15 text-pitch-200"
                    : "text-navy-300 hover:bg-white/5 hover:text-white",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pitch-500/20 text-sm font-bold text-pitch-200">
              {initials(user.name)}
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">{user.name}</div>
              {isAdmin && (
                <Badge variant="gold" className="px-1.5 py-0 text-[10px]">
                  ADMIN
                </Badge>
              )}
            </div>
          </div>
          <form action={signOut}>
            <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-navy-300 transition hover:bg-white/5 hover:text-white">
              Sign out
            </button>
          </form>
          <button
            className="rounded-lg border border-white/10 p-2 text-navy-200 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            <div className="space-y-1">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </div>
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-white/10 px-4 py-3 md:hidden">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3.5 py-2.5 text-sm font-semibold transition",
                  active ? "bg-pitch-500/15 text-pitch-200" : "text-navy-300 hover:bg-white/5",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
