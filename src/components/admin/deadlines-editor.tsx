"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { updateDeadline } from "@/app/actions/admin";
import { PHASE_LABELS, type Phase } from "@/lib/constants";

export interface DeadlineRow {
  phase: Phase;
  lockAt: string | null; // ISO
  isOpen: boolean;
  locked: boolean;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export function DeadlinesEditor({ rows }: { rows: DeadlineRow[] }) {
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <DeadlineRowEditor key={r.phase} row={r} />
      ))}
    </div>
  );
}

function DeadlineRowEditor({ row }: { row: DeadlineRow }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [lockAt, setLockAt] = useState(toLocalInput(row.lockAt));
  const [isOpen, setIsOpen] = useState(row.isOpen);

  function save() {
    start(async () => {
      const iso = lockAt ? new Date(lockAt).toISOString() : null;
      const res = await updateDeadline({ phase: row.phase, lockAt: iso, isOpen });
      toast(res.message, res.ok ? "success" : "error");
    });
  }

  return (
    <div className="glass flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-[180px] flex-1">
        <div className="font-semibold text-white">{PHASE_LABELS[row.phase]}</div>
        <div className="mt-0.5">
          {row.locked ? (
            <Badge variant="muted">Փակ է</Badge>
          ) : (
            <Badge variant="success">Բաց է</Badge>
          )}
        </div>
      </div>
      <input
        type="datetime-local"
        value={lockAt}
        onChange={(e) => setLockAt(e.target.value)}
        className="h-10 rounded-xl border border-white/10 bg-navy-900/70 px-3 text-sm text-white outline-none focus:border-pitch-400"
      />
      <label className="flex cursor-pointer items-center gap-2 text-sm text-navy-200">
        <input
          type="checkbox"
          checked={isOpen}
          onChange={(e) => setIsOpen(e.target.checked)}
          className="h-4 w-4 accent-pitch-500"
        />
        Բաց
      </label>
      <Button size="sm" variant="secondary" onClick={save} loading={pending}>
        Պահպանել
      </Button>
    </div>
  );
}
