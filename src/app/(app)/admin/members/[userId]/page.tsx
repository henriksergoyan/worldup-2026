import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getMemberPredictionsData } from "@/lib/member-predictions-data";
import { computeRankOutlook } from "@/lib/rank-analytics";
import { getActiveTournament } from "@/lib/standings";
import { AdminNav } from "@/components/admin/admin-nav";
import { MemberPredictionsView } from "@/components/member-predictions-view";
import { RankOutlookPanel } from "@/components/rank-outlook-panel";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const { userId } = await params;
  const { tab } = await searchParams;

  const data = await getMemberPredictionsData(userId, { viewerIsAdmin: true });
  if (!data) notFound();

  const tournament = await getActiveTournament();
  const outlook = await computeRankOutlook(tournament.id, userId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Link href="/admin/members" className="text-xs font-semibold text-navy-400 hover:text-white">
              ← Բոլոր մասնակիցները
            </Link>
          </div>
          <h1 className="font-display text-2xl font-black text-white md:text-3xl">
            {data.user.name} — կանխատեսումներ
          </h1>
          <p className="text-sm text-navy-300">
            {data.user.role === "ADMIN" ? "Ադմինիստրատոր" : "Մասնակից"} · Ադմինի դիտում (բոլոր տվյալները բաց են)
          </p>
        </div>
        {data.breakdown && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">#{data.breakdown.rank} տեղ</Badge>
            <Badge variant="info">{data.breakdown.totalPoints} միավոր</Badge>
          </div>
        )}
      </div>

      <AdminNav />

      {outlook && outlook.upcoming.length > 0 && (
        <RankOutlookPanel summary={outlook.summary} upcoming={outlook.upcoming} userName={data.user.name} />
      )}

      <MemberPredictionsView data={data} initialTab={tab} readOnly />
    </div>
  );
}
