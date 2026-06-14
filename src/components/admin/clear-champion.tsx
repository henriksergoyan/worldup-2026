"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { clearChampionTeam } from "@/app/actions/admin";

export function ClearChampion() {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await clearChampionTeam();
          toast(res.message, res.ok ? "success" : "error");
        })
      }
    >
      Clear champion
    </Button>
  );
}
