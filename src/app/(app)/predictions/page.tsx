import { requireUser } from "@/lib/auth";
import { getMemberPredictionsData } from "@/lib/member-predictions-data";
import { PredictionsTabs } from "@/components/predictions/predictions-tabs";
import { TIMEZONE_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PredictionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const isAdmin = user.role === "ADMIN";
  const data = await getMemberPredictionsData(user.id, { viewerIsAdmin: isAdmin });
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white md:text-3xl">Իմ կանխատեսումները</h1>
        <p className="text-sm text-navy-300">
          Լրացրեք հաշիվները նախքան փուլերի փակվելը։ Միավորները կերևան, երբ խաղերի արդյունքները վերջնական հաստատվեն ադմինիստրատորի կողմից։
        </p>
        <p className="mt-1 text-xs text-navy-500">
          Բոլոր ժամերը ցուցադրվում են {TIMEZONE_LABEL}ով (UTC+4) — անկախ ձեր գտնվելու վայրից։
        </p>
      </div>

      <PredictionsTabs
        initialTab={tab}
        groupMatches={data.groupMatches}
        knockoutMatches={data.knockoutMatches}
        standingsByGroup={data.standingsByGroup}
        teams={data.teams}
        championPick={data.championPick}
        qualifiers={data.qualifiers}
        averageQualifierPoints={data.averageQualifierPoints}
      />
    </div>
  );
}
