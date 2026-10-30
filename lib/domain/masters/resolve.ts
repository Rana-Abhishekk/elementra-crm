// Matching incoming values (integration keys, Meta answers, names) to master rows. PURE.

export interface SourceRef {
  id: string;
  name: string;
  isActive: boolean;
  isFallback: boolean;
  isPaid: boolean;
  color: string;
  integrationKeys: string[];
}

export interface ProductRef {
  id: string;
  name: string;
  isActive: boolean;
  metaAnswerKeys: string[];
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * value = a source id, a name ("Website") or an integration key ("meta:ig:paid", "sheet:Walkins").
 * Unknown values land on the fallback source; `matched` tells the caller to flag it.
 */
export function resolveSource(sources: SourceRef[], value: string | null | undefined): { source: SourceRef | null; matched: boolean } {
  const v = norm(value ?? "");
  if (v) {
    const hit =
      sources.find((s) => s.id === value) ??
      sources.find((s) => s.integrationKeys.some((k) => norm(k) === v)) ??
      sources.find((s) => norm(s.name) === v) ??
      // "sheet:Website" style keys with no explicit mapping still match by name
      (v.includes(":") ? sources.find((s) => norm(s.name) === v.slice(v.indexOf(":") + 1)) : undefined);
    if (hit) return { source: hit, matched: true };
  }
  const fallback = sources.find((s) => s.isFallback && s.isActive) ?? sources.find((s) => s.isFallback) ?? null;
  return { source: fallback, matched: false };
}

/** tokens = product ids, names, or Meta answers ("elementra_kitchens", "Kitchen, Wardrobes" split by the caller). */
export function resolveProducts(products: ProductRef[], tokens: string[]): { ids: string[]; unmatched: string[] } {
  const ids = new Set<string>();
  const unmatched: string[] = [];
  for (const raw of tokens) {
    const t = norm(raw);
    if (!t) continue;
    const key = t.replace(/\s+/g, "_");
    const hit =
      products.find((p) => p.id === raw) ??
      products.find((p) => p.metaAnswerKeys.some((k) => k.toLowerCase() === key || k.toLowerCase() === `elementra_${key}`)) ??
      products.find((p) => norm(p.name) === t) ??
      // "kitchen" ↔ "Kitchen", "wardrobe" ↔ "Wardrobes", "elementra_beds" ↔ "Beds"
      products.find((p) => {
        const n = norm(p.name).replace(/s$/, "");
        const k = t.replace(/^elementra_/, "").replace(/_/g, " ").replace(/s$/, "");
        return n === k;
      });
    if (hit) ids.add(hit.id);
    else unmatched.push(raw.trim());
  }
  return { ids: [...ids], unmatched };
}

/** "Kitchen and wardrobes" style, for templates ({{product}}). */
export function productPhrase(names: string[], fallback = "interiors"): string {
  const list = (names.length ? names : [fallback]).map((n) => n.toLowerCase());
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}
