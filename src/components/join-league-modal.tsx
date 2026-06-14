"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function JoinLeagueModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-league-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm animate-fade-in rounded-2xl border border-white/10 bg-navy-900 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg px-2 py-1 text-navy-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Close dialog"
        >
          ✕
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="relative h-36 w-36 overflow-hidden rounded-full ring-4 ring-pitch-500/30 ring-offset-4 ring-offset-navy-900">
            <Image
              src="/contact/tigran-tshorokhyan.png"
              alt="Tigran Tshorokhyan"
              fill
              className="object-cover object-top"
              sizes="144px"
              priority
            />
          </div>
          <h2 id="join-league-title" className="mt-5 font-display text-xl font-bold text-white">
            Tigran Tshorokhyan
          </h2>
          <p className="mt-2 text-sm text-navy-300">
            Ուզու՞մ ես միանալ մեր լիգային կամ հարցեր ունես: Կապվի՛ր Տիգրանի հետ.
          </p>
          <a
            href="tel:+37477454075"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-pitch-500/40 bg-pitch-500/15 px-5 py-3 text-lg font-bold text-pitch-100 transition hover:border-pitch-400 hover:bg-pitch-500/25"
          >
            <span aria-hidden>📞</span>
            +374 77 454075
          </a>
          <p className="mt-3 text-xs text-navy-500">Սեղմի՛ր զանգելու համար</p>
        </div>

        <Button variant="ghost" className="mt-6 w-full" onClick={onClose}>
          Փակել
        </Button>
      </div>
    </div>
  );
}
