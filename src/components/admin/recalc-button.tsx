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
      className="bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.35)] font-bold px-5 border-none"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await recalculate();
          toast(res.message, res.ok ? "success" : "error");
        })
      }
    >
      ♻︎ Վերահաշվարկ
    </Button>
  );
}
