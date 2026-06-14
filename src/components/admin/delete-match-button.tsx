"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { deleteMatch } from "@/app/actions/admin";

export function DeleteMatchButton({ matchId }: { matchId: string }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this match? This also removes its predictions and result.")) return;
        start(async () => {
          const res = await deleteMatch(matchId);
          toast(res.message, res.ok ? "success" : "error");
        });
      }}
      className="rounded-lg border border-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
