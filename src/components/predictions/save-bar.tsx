"use client";

import { Button } from "@/components/ui/button";

export function SaveBar({
  count,
  pending,
  onSave,
}: {
  count: number;
  pending: boolean;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-950/90 backdrop-blur-xl bottom-bar-pad">
      <div className="px-safe mx-auto flex max-w-6xl items-center justify-between gap-3 py-3">
        <span className="min-w-0 flex-1 truncate text-xs text-navy-300 sm:text-sm">
          {count > 0 ? (
            <>
              Ունեք <span className="font-bold text-white">{count}</span> չպահպանված ✍️
            </>
          ) : (
            "Բոլորը պահպանված է"
          )}
        </span>
        <Button onClick={onSave} loading={pending} disabled={count === 0} className="shrink-0">
          Պահպանել
        </Button>
      </div>
    </div>
  );
}
