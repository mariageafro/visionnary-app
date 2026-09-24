import type { Item } from "./types";

const minutes = (time: unknown) => {
  const hit = /^(\d{1,2})[:h](\d{2})?/.exec(String(time ?? "").trim());
  return hit ? Number(hit[1]) * 60 + Number(hit[2] ?? 0) : undefined;
};

/** Heure typique d'un moment de mariage d'après son nom, quand aucune étape du déroulé ne le situe. */
const typical: [RegExp, number][] = [
  [/pr[ée]paratif|maquillage|coiffure|habillage/i, 8 * 60 + 30],
  [/accessoire|d[ée]tail|bijou|alliance|robe|costume/i, 9 * 60 + 30],
  [/first look|d[ée]couverte/i, 12 * 60],
  [/cort[èe]ge|demoiselle|gar[çc]on|t[ée]moin|famille/i, 12 * 60 + 30],
  [/mairie|civil/i, 13 * 60 + 30],
  [/c[ée]r[ée]monie|[ée]glise|laïque|laique/i, 15 * 60],
  [/sortie|confetti|riz/i, 16 * 60 + 15],
  [/vin d.honneur|cocktail/i, 17 * 60],
  [/groupe/i, 17 * 60 + 30],
  [/couple|portrait|s[ée]ance/i, 18 * 60],
  [/r[ée]ception|salle|d[ée]coration/i, 19 * 60],
  [/entr[ée]e/i, 19 * 60 + 30],
  [/d[iî]ner|repas|discours/i, 20 * 60],
  [/g[âa]teau|pi[èe]ce mont[ée]e/i, 22 * 60],
  [/ouverture de bal|premi[èe]re danse|danse/i, 22 * 60 + 30],
  [/soir[ée]e|bal|dj|f[êe]te/i, 23 * 60],
];

/**
 * Ordre des sections d'après la journée : heure médiane des étapes du déroulé auxquelles se rattachent
 * ses éléments, à défaut heure typique déduite du nom. Une section sans indice garde sa place relative.
 * Renvoie les titres dans l'ordre chronologique (égalités : ordre d'origine).
 */
export function orderByDay(sections: { title: string; items: Item[] }[], stages: Item[]): string[] {
  const stageTime = new Map(stages.map((s) => [s.id, minutes(s.time)]));
  const keyed = sections.map(({ title, items }, index) => {
    const times = items.map((i) => stageTime.get(String(i.stageId))).filter((t): t is number => t !== undefined).sort((a, b) => a - b);
    const fromStages = times.length ? times[Math.floor(times.length / 2)] : undefined;
    const fromName = typical.find(([re]) => re.test(title))?.[1];
    return { title, index, at: fromStages ?? fromName };
  });
  // Sans indice : juste après la section connue qui précède.
  let last = -1;
  for (const k of keyed) {
    if (k.at === undefined) k.at = last + 0.001;
    else last = k.at;
  }
  return keyed.sort((a, b) => a.at! - b.at! || a.index - b.index).map((k) => k.title);
}
