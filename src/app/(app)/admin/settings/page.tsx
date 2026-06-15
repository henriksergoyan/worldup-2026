import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTournament } from "@/lib/standings";
import { AdminNav } from "@/components/admin/admin-nav";
import { SettingsEditor } from "@/components/admin/settings-editor";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const tournament = await getActiveTournament();
  const paidCount = await prisma.user.count({ where: { role: "PLAYER", paid: true } });
  const prizeSplit = (tournament.prizeSplitJson ?? {}) as Record<string, number>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white md:text-3xl">Կարգավորումներ</h1>
        <p className="text-sm text-navy-300">Մասնակցության վարձ, փլեյ-օֆ ընտրությունների թիվ և մրցանակների բաշխում։</p>
      </div>
      <AdminNav />
      <SettingsEditor
        entryFee={tournament.entryFee}
        knockoutPickCount={tournament.knockoutPickCount}
        kickoffLockMinutes={tournament.kickoffLockMinutes}
        registrationOpen={tournament.registrationOpen}
        prizeSplit={prizeSplit}
        paidCount={paidCount}
      />
    </div>
  );
}
