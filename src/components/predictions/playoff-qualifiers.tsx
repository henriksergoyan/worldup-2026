import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { flagFor, translateTeam } from "@/lib/flags";
import type { QualifiersViz, QualifierTeamView } from "@/lib/qualifiers";

function TeamRow({ t, actualKnown }: { t: QualifierTeamView; actualKnown: boolean }) {
  const label = t.name ? translateTeam(t.name) : "—";
  const flag = t.name ? flagFor(t.name) : "❓";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-sm",
        actualKnown && t.hit && "border-pitch-500/40 bg-pitch-500/10",
        actualKnown && !t.hit && "border-red-500/30 bg-red-500/5",
        !actualKnown && "border-white/10 bg-white/[0.02]",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="text-base leading-none">{flag}</span>
        <span className="truncate font-semibold text-white">{label}</span>
      </span>
      {actualKnown ? (
        t.hit ? (
          <span className="shrink-0 text-xs font-bold text-pitch-300">+2 ✓</span>
        ) : (
          <span className="shrink-0 text-xs font-semibold text-red-300">✗</span>
        )
      ) : (
        <span className="shrink-0 text-xs text-navy-500">սպասում</span>
      )}
    </div>
  );
}

/**
 * Visualizes the +2-per-qualifier rule: which teams the player's predicted group
 * standings send to the knockout stage, and whether each actually advanced.
 */
export function PlayoffQualifiers({ viz }: { viz: QualifiersViz }) {
  const anyPredicted =
    viz.groups.some((g) => g.teams.length > 0) || viz.bestThirds.length > 0;

  return (
    <Card className="mb-5 border-white/10">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">🎟️ Անցում փլեյ-օֆֆ</CardTitle>
          <p className="mt-1 text-xs text-navy-400">
            +2 միավոր՝ ձեր կանխատեսած աղյուսակով անցած յուրաքանչյուր թիմի համար, որն իրականում էլ անցնում է։
          </p>
        </div>
        <Badge variant={viz.points > 0 ? "gold" : "muted"} className="shrink-0">
          {viz.points} մվ
        </Badge>
      </CardHeader>
      <CardContent>
        {!anyPredicted ? (
          <p className="text-sm text-navy-400">
            Լրացրեք խմբային փուլի հաշիվները՝ անցնող թիմերը որոշվելու համար։
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {viz.groups.map((g) => (
                <div key={g.groupCode} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-navy-300">
                      Խումբ {g.groupCode}
                    </span>
                    {!g.complete && (
                      <span className="text-[10px] text-navy-500">թերի</span>
                    )}
                  </div>
                  {g.teams.length > 0 ? (
                    g.teams.map((t) => (
                      <TeamRow key={t.teamId} t={t} actualKnown={viz.actualKnown} />
                    ))
                  ) : (
                    <p className="text-xs text-navy-600">—</p>
                  )}
                </div>
              ))}
            </div>

            {viz.bestThirds.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-navy-300">
                  Լավագույն 8 երրորդ տեղ
                </span>
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                  {viz.bestThirds.map((t) => (
                    <TeamRow key={t.teamId} t={t} actualKnown={viz.actualKnown} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
