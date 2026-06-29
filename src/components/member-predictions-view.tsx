import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PredictionsTabs } from "@/components/predictions/predictions-tabs";
import type { MemberPredictionsData } from "@/lib/member-predictions-data";

export function MemberPredictionsView({
  data,
  initialTab,
  readOnly = false,
  memberLabel,
  adminEditUserId,
}: {
  data: MemberPredictionsData;
  initialTab?: string;
  readOnly?: boolean;
  memberLabel?: string;
  adminEditUserId?: string;
}) {
  return (
    <div className="space-y-4">
      {adminEditUserId && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <strong>Ադմինի խմբագրում.</strong> Կարող եք փոխել այս մասնակցի կանխատեսումները ցանկացած խաղի համար, ներառյալ ավարտվածները։
        </div>
      )}
      {data.breakdown && (
        <Card className="border-white/10">
          <CardContent className="flex flex-wrap gap-3 py-4">
            <Stat label="Դիրք" value={`#${data.breakdown.rank}`} />
            <Stat label="Ընդհանուր" value={`${data.breakdown.totalPoints} մվ`} accent />
            <Stat label="Խմբային" value={String(data.breakdown.groupStagePoints)} />
            <Stat label="Փլեյ-օֆֆ" value={String(data.breakdown.knockoutStagePoints)} />
            <Stat label="Անցած թիմեր" value={String(data.breakdown.knockoutTeamPoints)} />
            <Stat label="Չեմպիոն" value={String(data.breakdown.championPoints)} />
            <Stat label="Ճշգրիտ հաշիվ" value={String(data.breakdown.exactScoreHits)} />
          </CardContent>
        </Card>
      )}

      <PredictionsTabs
        initialTab={initialTab}
        groupMatches={data.groupMatches}
        knockoutMatches={data.knockoutMatches}
        standingsByGroup={data.standingsByGroup}
        teams={data.teams}
        championPick={data.championPick}
        qualifierPicks={data.qualifierPicks}
        pickLimit={data.tournament.knockoutPickCount}
        championLock={data.championLock}
        teamsLock={data.teamsLock}
        qualifiers={data.qualifiers}
        readOnly={readOnly}
        memberLabel={memberLabel ?? data.user.name}
        adminEditUserId={adminEditUserId}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-navy-500">{label}</div>
      <div className={`text-lg font-black ${accent ? "text-pitch-300" : "text-white"}`}>{value}</div>
    </div>
  );
}
