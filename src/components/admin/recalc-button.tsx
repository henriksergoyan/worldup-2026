"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { recalculate } from "@/app/actions/admin";

export function RecalcButton() {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await recalculate();
          toast(res.message, res.ok ? "success" : "error");
        })
      }
    >
      ♻︎ Recalculate
    </Button>
  );
}
