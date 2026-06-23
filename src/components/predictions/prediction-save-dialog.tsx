"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export type PredictionOutcome = {
  homeName: string;
  awayName: string;
  result: "HOME" | "AWAY" | "DRAW";
};

export type BizaConfirmation =
  | { kind: "decisive"; winner: string; loser: string }
  | { kind: "draw"; team: string };

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Builds Biza's guilt-trip confirmation from the predictions being saved.
 * Returns null when there is nothing meaningful to comment on.
 */
export function buildBizaConfirmation(outcomes: PredictionOutcome[]): BizaConfirmation | null {
  const valid = outcomes.filter((o) => o.homeName && o.awayName);
  if (valid.length === 0) return null;

  const decisive = valid.filter((o) => o.result !== "DRAW");
  if (decisive.length > 0) {
    const chosen = pick(decisive);
    const winner = chosen.result === "HOME" ? chosen.homeName : chosen.awayName;
    const loser = chosen.result === "HOME" ? chosen.awayName : chosen.homeName;
    return { kind: "decisive", winner, loser };
  }

  const chosen = pick(valid);
  const team = Math.random() < 0.5 ? chosen.homeName : chosen.awayName;
  return { kind: "draw", team };
}

function Team({ name, tone }: { name: string; tone: "win" | "lose" }) {
  return (
    <span
      className={
        tone === "win"
          ? "font-extrabold text-pitch-300"
          : "font-extrabold text-amber-300"
      }
    >
      {name}
    </span>
  );
}

export function PredictionSaveDialog({
  confirmation,
  pending,
  onConfirm,
  onCancel,
}: {
  confirmation: BizaConfirmation | null;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const open = confirmation !== null;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onCancel();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, pending, onCancel]);

  if (!confirmation) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="biza-confirm-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-navy-950/85 backdrop-blur-sm"
        aria-label="Փակել"
        onClick={() => !pending && onCancel()}
      />

      <div className="relative z-10 w-full max-w-md animate-fade-in overflow-hidden rounded-3xl border border-white/10 bg-navy-900 shadow-2xl">
        <div className="relative h-44 w-full overflow-hidden sm:h-52">
          <Image
            src="/biza-shofer.png"
            alt="Բիձեն"
            fill
            className="object-cover object-top"
            sizes="448px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/20 to-transparent" />
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-navy-950/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-sm">
            <span aria-hidden>☝️</span> Բիձեն ասում ա
          </span>
        </div>

        <div className="px-6 pb-6 pt-4">
          <div className="relative rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.08] to-white/[0.02] p-4">
            <span
              aria-hidden
              className="absolute -top-2 left-8 h-4 w-4 rotate-45 border-l border-t border-amber-400/20 bg-amber-500/[0.08]"
            />
            <p
              id="biza-confirm-title"
              className="text-[15px] font-semibold leading-relaxed text-navy-100"
            >
              {confirmation.kind === "decisive" ? (
                <>
                  Լսել եմ <Team name={confirmation.winner} tone="win" />-ի վրա ես որոշել դնես,
                  ախպորս տղեն <Team name={confirmation.loser} tone="lose" />-ի նախագահի շոֆեռն ա ու
                  ասել ա՝ եթե էսօր <Team name={confirmation.loser} tone="lose" />-ը չկրի, էս տարի ոչ
                  մի տուրիստ <Team name={confirmation.loser} tone="lose" />-ից չի գնալու{" "}
                  <Team name={confirmation.winner} tone="win" /> հանգստանալու։{" "}
                  <span className="text-white">Վստա՞հ ես։</span>
                </>
              ) : (
                <>
                  Էս <Team name={confirmation.team} tone="win" />-ի հաղթանակին չես հավատում, հա՞{" "}
                  <span className="text-white">🤨</span>
                </>
              )}
            </p>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full"
              onClick={onCancel}
              disabled={pending}
            >
              Չէ, ետ նայեմ 🤔
            </Button>
            <Button className="w-full" onClick={onConfirm} loading={pending}>
              Հա, վստահ եմ 💪
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
