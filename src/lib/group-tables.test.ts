import { describe, expect, it } from "vitest";
import { buildGroupTables, rankThirdPlaceTeams } from "./group-tables";

describe("group-tables", () => {
  it("ranks a complete group by points", () => {
    const teams = [
      { id: "a", name: "Alpha", groupCode: "A" },
      { id: "b", name: "Beta", groupCode: "A" },
      { id: "c", name: "Gamma", groupCode: "A" },
      { id: "d", name: "Delta", groupCode: "A" },
    ];
    const matches = [
      mk("A", "a", "b", 2, 0, true),
      mk("A", "c", "d", 1, 1, true),
      mk("A", "a", "c", 3, 0, true),
      mk("A", "b", "d", 2, 1, true),
      mk("A", "a", "d", 1, 0, true),
      mk("A", "b", "c", 0, 0, true),
    ];
    const tables = buildGroupTables(teams, matches);
    const table = tables.get("A");
    expect(table?.complete).toBe(true);
    expect(table?.rows[0].teamId).toBe("a");
    expect(table?.rows[1].teamId).toBe("b");
    expect(table?.rows[2].teamId).toBe("c");
  });

  it("picks top eight third-place teams", () => {
    const teams = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].flatMap((g) => [
      { id: `${g}1`, name: `${g}1`, groupCode: g },
      { id: `${g}2`, name: `${g}2`, groupCode: g },
      { id: `${g}3`, name: `${g}3`, groupCode: g },
      { id: `${g}4`, name: `${g}4`, groupCode: g },
    ]);
    const matches = teams.flatMap((t) => {
      const g = t.groupCode!;
      const others = teams.filter((x) => x.groupCode === g && x.id !== t.id);
      return others.map((o, i) => {
        const isThird = t.id.endsWith("3");
        const homeGoals = isThird ? 0 : 2;
        const awayGoals = isThird ? 2 : 0;
        return mk(g, t.id, o.id, homeGoals, awayGoals, true);
      });
    });
    const tables = buildGroupTables(teams, matches);
    const thirds = rankThirdPlaceTeams(tables);
    expect(thirds).toHaveLength(8);
  });
});

function mk(
  groupCode: string,
  home: string,
  away: string,
  hg: number,
  ag: number,
  finalized: boolean,
) {
  return {
    groupCode,
    homeTeamId: home,
    awayTeamId: away,
    result: { normalHomeGoals: hg, normalAwayGoals: ag, finalized },
  };
}
