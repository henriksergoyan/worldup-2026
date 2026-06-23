// Emoji flags for the 48 teams (best-effort, falls back to a soccer ball).
export const TEAM_FLAGS: Record<string, string> = {
  Mexico: "🇲🇽",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  "Czech Republic": "🇨🇿",
  Canada: "🇨🇦",
  "Bosnia and Herzegovina": "🇧🇦",
  Qatar: "🇶🇦",
  Switzerland: "🇨🇭",
  Brazil: "🇧🇷",
  Morocco: "🇲🇦",
  Haiti: "🇭🇹",
  Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "United States": "🇺🇸",
  Paraguay: "🇵🇾",
  Australia: "🇦🇺",
  Turkey: "🇹🇷",
  Germany: "🇩🇪",
  "Curaçao": "🇨🇼",
  "Ivory Coast": "🇨🇮",
  Ecuador: "🇪🇨",
  Netherlands: "🇳🇱",
  Japan: "🇯🇵",
  Sweden: "🇸🇪",
  Tunisia: "🇹🇳",
  Belgium: "🇧🇪",
  Egypt: "🇪🇬",
  Iran: "🇮🇷",
  "New Zealand": "🇳🇿",
  Spain: "🇪🇸",
  "Cape Verde": "🇨🇻",
  "Saudi Arabia": "🇸🇦",
  Uruguay: "🇺🇾",
  France: "🇫🇷",
  Senegal: "🇸🇳",
  Iraq: "🇮🇶",
  Norway: "🇳🇴",
  Argentina: "🇦🇷",
  Algeria: "🇩🇿",
  Austria: "🇦🇹",
  Jordan: "🇯🇴",
  Portugal: "🇵🇹",
  "DR Congo": "🇨🇩",
  Uzbekistan: "🇺🇿",
  Colombia: "🇨🇴",
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Croatia: "🇭🇷",
  Ghana: "🇬🇭",
  Panama: "🇵🇦",
};

export type TeamDeclension = {
  plain: string;
  genitive: string;
  definite: string;
  ablative: string;
};

export const TEAM_DECLENSIONS: Record<string, TeamDeclension> = {
  Mexico: {
    plain: "Մեքսիկա",
    genitive: "Մեքսիկայի",
    definite: "Մեքսիկան",
    ablative: "Մեքսիկայից",
  },
  "South Africa": {
    plain: "Հարավային Աֆրիկա",
    genitive: "Հարավային Աֆրիկայի",
    definite: "Հարավային Աֆրիկան",
    ablative: "Հարավային Աֆրիկայից",
  },
  "South Korea": {
    plain: "Հարավային Կորեա",
    genitive: "Հարավային Կորեայի",
    definite: "Հարավային Կորեան",
    ablative: "Հարավային Կորեայից",
  },
  "Czech Republic": {
    plain: "Չեխիա",
    genitive: "Չեխիայի",
    definite: "Չեխիան",
    ablative: "Չեխիայից",
  },
  Canada: {
    plain: "Կանադա",
    genitive: "Կանադայի",
    definite: "Կանադան",
    ablative: "Կանադայից",
  },
  "Bosnia and Herzegovina": {
    plain: "Բոսնիա և Հերցեգովինա",
    genitive: "Բոսնիա և Հերցեգովինայի",
    definite: "Բոսնիա և Հերցեգովինան",
    ablative: "Բոսնիա և Հերցեգովինայից",
  },
  Qatar: {
    plain: "Կատար",
    genitive: "Կատարի",
    definite: "Կատարը",
    ablative: "Կատարից",
  },
  Switzerland: {
    plain: "Շվեյցարիա",
    genitive: "Շվեյցարիայի",
    definite: "Շվեյցարիան",
    ablative: "Շվեյցարիայից",
  },
  Brazil: {
    plain: "Բրազիլիա",
    genitive: "Բրազիլիայի",
    definite: "Բրազիլիան",
    ablative: "Բրազիլիայից",
  },
  Morocco: {
    plain: "Մարոկկո",
    genitive: "Մարոկկոյի",
    definite: "Մարոկկոն",
    ablative: "Մարոկկոյից",
  },
  Haiti: {
    plain: "Հայիթի",
    genitive: "Հայիթիի",
    definite: "Հայիթին",
    ablative: "Հայիթիից",
  },
  Scotland: {
    plain: "Շոտլանդիա",
    genitive: "Շոտլանդիայի",
    definite: "Շոտլանդիան",
    ablative: "Շոտլանդիայից",
  },
  "United States": {
    plain: "ԱՄՆ",
    genitive: "ԱՄՆ-ի",
    definite: "ԱՄՆ-ը",
    ablative: "ԱՄՆ-ից",
  },
  Paraguay: {
    plain: "Պարագվայ",
    genitive: "Պարագվայի",
    definite: "Պարագվայը",
    ablative: "Պարագվայից",
  },
  Australia: {
    plain: "Ավստրալիա",
    genitive: "Ավստրալիայի",
    definite: "Ավստրալիան",
    ablative: "Ավստրալիայից",
  },
  Turkey: {
    plain: "Թուրքիա",
    genitive: "Թուրքիայի",
    definite: "Թուրքիան",
    ablative: "Թուրքիայից",
  },
  Germany: {
    plain: "Գերմանիա",
    genitive: "Գերմանիայի",
    definite: "Գերմանիան",
    ablative: "Գերմանիայից",
  },
  "Curaçao": {
    plain: "Կյուրասաո",
    genitive: "Կյուրասաոյի",
    definite: "Կյուրասաոն",
    ablative: "Կյուրասաոյից",
  },
  "Ivory Coast": {
    plain: "Կոտ դ'Իվուար",
    genitive: "Կոտ դ'Իվուարի",
    definite: "Կոտ դ'Իվուարը",
    ablative: "Կոտ դ'Իվուարից",
  },
  Ecuador: {
    plain: "Էկվադոր",
    genitive: "Էկվադորի",
    definite: "Էկվադորը",
    ablative: "Էկվադորից",
  },
  Netherlands: {
    plain: "Նիդերլանդներ",
    genitive: "Նիդերլանդների",
    definite: "Նիդերլանդները",
    ablative: "Նիդերլանդներից",
  },
  Japan: {
    plain: "Ճապոնիա",
    genitive: "Ճապոնիայի",
    definite: "Ճապոնիան",
    ablative: "Ճապոնիայից",
  },
  Sweden: {
    plain: "Շվեդիա",
    genitive: "Շվեդիայի",
    definite: "Շվեդիան",
    ablative: "Շվեդիայից",
  },
  Tunisia: {
    plain: "Թունիս",
    genitive: "Թունիսի",
    definite: "Թունիսը",
    ablative: "Թունիսից",
  },
  Belgium: {
    plain: "Բելգիա",
    genitive: "Բելգիայի",
    definite: "Բելգիան",
    ablative: "Բելգիայից",
  },
  Egypt: {
    plain: "Եգիպտոս",
    genitive: "Եգիպտոսի",
    definite: "Եգիպտոսը",
    ablative: "Եգիպտոսից",
  },
  Iran: {
    plain: "Իրան",
    genitive: "Իրանի",
    definite: "Իրանը",
    ablative: "Իրանից",
  },
  "New Zealand": {
    plain: "Նոր Զելանդիա",
    genitive: "Նոր Զելանդիայի",
    definite: "Նոր Զելանդիան",
    ablative: "Նոր Զելանդիայից",
  },
  Spain: {
    plain: "Իսպանիա",
    genitive: "Իսպանիայի",
    definite: "Իսպանիան",
    ablative: "Իսպանիայից",
  },
  "Cape Verde": {
    plain: "Կաբո Վերդե",
    genitive: "Կաբո Վերդեի",
    definite: "Կաբո Վերդեն",
    ablative: "Կաբո Վերդեից",
  },
  "Saudi Arabia": {
    plain: "Սաուդյան Արաբիա",
    genitive: "Սաուդյան Արաբիայի",
    definite: "Սաուդյան Արաբիան",
    ablative: "Սաուդյան Արաբիայից",
  },
  Uruguay: {
    plain: "Ուրուգվայ",
    genitive: "Ուրուգվայի",
    definite: "Ուրուգվայը",
    ablative: "Ուրուգվայից",
  },
  France: {
    plain: "Ֆրանսիա",
    genitive: "Ֆրանսիայի",
    definite: "Ֆրանսիան",
    ablative: "Ֆրանսիայից",
  },
  Senegal: {
    plain: "Սենեգալ",
    genitive: "Սենեգալի",
    definite: "Սենեգալը",
    ablative: "Սենեգալից",
  },
  Iraq: {
    plain: "Իրաք",
    genitive: "Իրաքի",
    definite: "Իրաքը",
    ablative: "Իրաքից",
  },
  Norway: {
    plain: "Նորվեգիա",
    genitive: "Նորվեգիայի",
    definite: "Նորվեգիան",
    ablative: "Նորվեգիայից",
  },
  Argentina: {
    plain: "Արգենտինա",
    genitive: "Արգենտինայի",
    definite: "Արգենտինան",
    ablative: "Արգենտինայից",
  },
  Algeria: {
    plain: "Ալժիր",
    genitive: "Ալժիրի",
    definite: "Ալժիրը",
    ablative: "Ալժիրից",
  },
  Austria: {
    plain: "Ավստրիա",
    genitive: "Ավստրիայի",
    definite: "Ավստրիան",
    ablative: "Ավստրիայից",
  },
  Jordan: {
    plain: "Հորդանան",
    genitive: "Հորդանանի",
    definite: "Հորդանանը",
    ablative: "Հորդանանից",
  },
  Portugal: {
    plain: "Պորտուգալիա",
    genitive: "Պորտուգալիայի",
    definite: "Պորտուգալիան",
    ablative: "Պորտուգալիայից",
  },
  "DR Congo": {
    plain: "Կոնգոյի ԴՀ",
    genitive: "Կոնգոյի ԴՀ-ի",
    definite: "Կոնգոյի ԴՀ-ն",
    ablative: "Կոնգոյի ԴՀ-ից",
  },
  Uzbekistan: {
    plain: "Ուզբեկստան",
    genitive: "Ուզբեկստանի",
    definite: "Ուզբեկստանը",
    ablative: "Ուզբեկստանից",
  },
  Colombia: {
    plain: "Կոլումբիա",
    genitive: "Կոլումբիայի",
    definite: "Կոլումբիան",
    ablative: "Կոլումբիայից",
  },
  England: {
    plain: "Անգլիա",
    genitive: "Անգլիայի",
    definite: "Անգլիան",
    ablative: "Անգլիայից",
  },
  Croatia: {
    plain: "Խորվաթիա",
    genitive: "Խորվաթիայի",
    definite: "Խորվաթիան",
    ablative: "Խորվաթիայից",
  },
  Ghana: {
    plain: "Գանա",
    genitive: "Գանայի",
    definite: "Գանան",
    ablative: "Գանայից",
  },
  Panama: {
    plain: "Պանամա",
    genitive: "Պանամայի",
    definite: "Պանաման",
    ablative: "Պանամայից",
  },
};

export function translateTeam(name: string | null | undefined): string {
  if (!name) return "";
  return TEAM_DECLENSIONS[name]?.plain ?? name;
}

export function declineTeam(
  name: string | null | undefined,
  caseType: "plain" | "genitive" | "definite" | "ablative"
): string {
  if (!name) return "";
  const decl = TEAM_DECLENSIONS[name];
  if (!decl) return name;
  return decl[caseType];
}

export function flagFor(teamName: string | null | undefined): string {
  if (!teamName) return "⚽";
  return TEAM_FLAGS[teamName] ?? "⚽";
}
