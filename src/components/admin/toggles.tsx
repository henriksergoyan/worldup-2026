"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import {
  setUserPaid,
  setUserActive,
  setTeamQualified,
  setChampionTeam,
} from "@/app/actions/admin";

function Switch({
  checked,
  onToggle,
  pending,
  labelOn = "Միացված",
  labelOff = "Անջատված",
}: {
  checked: boolean;
  onToggle: () => void;
  pending: boolean;
  labelOn?: string;
  labelOff?: string;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50",
        checked
          ? "border-pitch-500/40 bg-pitch-500/20 text-pitch-100"
          : "border-white/10 bg-white/[0.03] text-navy-300",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", checked ? "bg-pitch-400" : "bg-navy-500")} />
      {checked ? labelOn : labelOff}
    </button>
  );
}

export function PaidToggle({ userId, paid }: { userId: string; paid: boolean }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <Switch
      checked={paid}
      pending={pending}
      labelOn="Վճարած"
      labelOff="Չվճարած"
      onToggle={() =>
        start(async () => {
          const res = await setUserPaid(userId, !paid);
          toast(res.message, res.ok ? "success" : "error");
        })
      }
    />
  );
}

export function ActiveToggle({ userId, active }: { userId: string; active: boolean }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <Switch
      checked={active}
      pending={pending}
      labelOn="Ակտիվ"
      labelOff="Անջատված"
      onToggle={() =>
        start(async () => {
          const res = await setUserActive(userId, !active);
          toast(res.message, res.ok ? "success" : "error");
        })
      }
    />
  );
}

export function QualifiedToggle({ teamId, qualified }: { teamId: string; qualified: boolean }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <Switch
      checked={qualified}
      pending={pending}
      labelOn="Փլեյ-օֆ"
      labelOff="Դուրս"
      onToggle={() =>
        start(async () => {
          const res = await setTeamQualified(teamId, !qualified);
          toast(res.message, res.ok ? "success" : "error");
        })
      }
    />
  );
}

export function ChampionButton({ teamId, isChampion }: { teamId: string; isChampion: boolean }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setChampionTeam(teamId);
          toast(res.message, res.ok ? "success" : "error");
        })
      }
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50",
        isChampion
          ? "border-gold-500/50 bg-gold-500/20 text-gold-400"
          : "border-white/10 bg-white/[0.03] text-navy-300 hover:bg-white/5",
      )}
    >
      {isChampion ? "★ Չեմպիոն" : "Չեմպիոն նշել"}
    </button>
  );
}
