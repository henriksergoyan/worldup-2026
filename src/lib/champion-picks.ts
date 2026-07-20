export interface ChampionPickRow {
  userId: string;
  name: string;
  teamId: string;
  teamName: string;
  isMe: boolean;
}

export function mapChampionPickRows(
  picks: { userId: string; teamId: string; user: { id: string; name: string }; team: { id: string; name: string } }[],
  viewerId: string,
): ChampionPickRow[] {
  return picks.map((p) => ({
    userId: p.user.id,
    name: p.user.name,
    teamId: p.team.id,
    teamName: p.team.name,
    isMe: p.user.id === viewerId,
  }));
}
