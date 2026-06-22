import { requireAdmin } from "@/lib/auth";
import { getActiveTournament } from "@/lib/standings";
import { getDeadlineMap } from "@/lib/deadlines";
import { getDeadlineCompletionReport } from "@/lib/deadline-completion";
import { AdminNav } from "@/components/admin/admin-nav";
import { DeadlinesEditor, type DeadlineRow } from "@/components/admin/deadlines-editor";
import { DeadlineCompletionPanel } from "@/components/admin/deadline-completion-panel";
import { PHASE_ORDER } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminDeadlinesPage() {
  await requireAdmin();
  const tournament = await getActiveTournament();
  const [map, deadlineCompletion] = await Promise.all([
    getDeadlineMap(tournament.id),
    getDeadlineCompletionReport(tournament.id),
  ]);

  const rows: DeadlineRow[] = PHASE_ORDER.map((phase) => {
    const d = map.get(phase);
    return {
      phase,
      lockAt: d?.lockAt?.toISOString() ?? null,
      isOpen: d?.isOpen ?? true,
      locked: d?.locked ?? false,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white md:text-3xl">Ժամկետներ</h1>
        <p className="text-sm text-navy-300">
          Սահմանեք փակման ժամը (տեղական ժամանակ) յուրաքանչյուր փուլի համար։ «Բաց» նշումը հանեք՝ փուլը փակելու համար,
          կամ սահմանեք ապագա ժամ և թողեք բաց՝ փուլը վերաբացելու համար։
        </p>
      </div>
      <AdminNav />
      <DeadlineCompletionPanel report={deadlineCompletion} />
      <DeadlinesEditor rows={rows} />
    </div>
  );
}
