// resolveLocation(): messy site text → locality + coordinates + method + confidence (spec §8.2). Pure.
import type { GeoMethod } from "@prisma/client";
import { CITY_FALLBACKS, OUT_OF_AREA_REGIONS, type GazetteerEntry } from "./gazetteer";
import { jaroWinkler } from "./jaroWinkler";
import { DIRECTIONS, cleanText, coreText, extractPincode, hasPhrase, isEmptyLocation, stripDirections } from "./normalise";

export type LocalityRef = GazetteerEntry & { id?: string };

export interface ResolveInput {
  siteAddress?: string | null;
  pincode?: string | null;
  city?: string | null;
}

export interface ResolvedLocation {
  /** RESOLVED = coordinates known; REGION = outside the service area by keyword, no coordinates; NONE = unknown */
  kind: "RESOLVED" | "REGION" | "NONE";
  method: GeoMethod;
  confidence: number | null;
  locality: LocalityRef | null;
  lat: number | null;
  lng: number | null;
  /** typed pincode if any, else the matched locality's */
  pincode: string | null;
  typedPincode: string | null;
  matchedText: string | null;
  label: string | null; // "Borivali West, Mumbai 400092"
  note: string | null;
  inputText: string;
}

export interface ResolveOptions {
  fuzzyThreshold?: number;
}

interface Phrase {
  text: string;
  base: string;
  hasDirection: boolean;
  loc: LocalityRef;
}

const MIN_FUZZY_LEN = 5; // "sion", "juhu", "khar" only match exactly or by alias

const indexCache = new WeakMap<LocalityRef[], { phrases: Phrase[] }>();

function buildIndex(localities: LocalityRef[]) {
  const cached = indexCache.get(localities);
  if (cached) return cached;
  const phrases: Phrase[] = [];
  for (const loc of localities) {
    for (const raw of [loc.name, ...loc.aliases]) {
      const text = coreText(raw);
      if (!text) continue;
      const base = stripDirections(text);
      phrases.push({ text, base, hasDirection: base !== text, loc });
    }
  }
  const index = { phrases };
  indexCache.set(localities, index);
  return index;
}

export const localityLabel = (l: Pick<GazetteerEntry, "name" | "city" | "pincode">) =>
  `${l.name}, ${l.city}${l.pincode ? ` ${l.pincode}` : ""}`;

const isMumbai = (l: LocalityRef) => !["Pune"].includes(l.city);

/** Better = longer locality name, then Mumbai over Pune */
function preferLocality(a: LocalityRef, b: LocalityRef) {
  if (a.name.length !== b.name.length) return a.name.length > b.name.length ? a : b;
  if (isMumbai(a) !== isMumbai(b)) return isMumbai(a) ? a : b;
  return a;
}

/** For a base name ("andheri"), pick the entry with the typed direction, else the undirected / West entry. */
function pickForBase(phrases: Phrase[], base: string, direction: string | null): LocalityRef | null {
  const sameBase = phrases.filter((p) => p.base === base);
  if (!sameBase.length) return null;
  if (direction) {
    const exact = sameBase.find((p) => p.text.split(" ").includes(direction));
    if (exact) return exact.loc;
    // e.g. "chembur east" where only "Chembur" exists: the direction doesn't matter
    const undirected = sameBase.find((p) => !p.hasDirection);
    if (undirected) return undirected.loc;
  }
  return (
    sameBase.find((p) => !p.hasDirection)?.loc ??
    sameBase.find((p) => p.text.split(" ").includes("west"))?.loc ??
    sameBase[0].loc
  );
}

function result(input: string, partial: Partial<ResolvedLocation>): ResolvedLocation {
  const loc = partial.locality ?? null;
  return {
    kind: loc ? "RESOLVED" : "NONE",
    method: "NONE",
    confidence: null,
    locality: loc,
    lat: loc?.lat ?? null,
    lng: loc?.lng ?? null,
    pincode: partial.typedPincode ?? loc?.pincode ?? null,
    typedPincode: null,
    matchedText: null,
    label: loc ? localityLabel(loc) : null,
    note: null,
    inputText: input,
    ...partial,
  };
}

export function resolveLocation(input: ResolveInput, localities: LocalityRef[], opts: ResolveOptions = {}): ResolvedLocation {
  const threshold = opts.fuzzyThreshold ?? 0.88;
  const address = input.siteAddress?.trim() ?? "";
  const inputText = [address, input.pincode, input.city].filter((s) => s && !isEmptyLocation(s)).join(", ");
  const typedPincode = extractPincode(input.pincode, address);

  if (!typedPincode && isEmptyLocation(address) && isEmptyLocation(input.city)) {
    return result(inputText, { note: "No location given" });
  }

  const { phrases } = buildIndex(localities);
  const text = coreText([address, input.city].filter(Boolean).join(" "));
  const tokens = text.split(" ").filter(Boolean);

  // 1. Pincode
  if (typedPincode) {
    const withPin = localities.filter((l) => l.pincode === typedPincode);
    if (withPin.length) {
      // Several localities share a pincode: prefer the one also named in the text
      const named = withPin.find((l) => phrases.some((p) => p.loc === l && hasPhrase(text, p.text)));
      return result(inputText, { method: "PINCODE", confidence: 1, locality: named ?? withPin[0], typedPincode, matchedText: typedPincode });
    }
  }

  // 2. Alias / exact name — longest phrase wins ("andheri east" beats "andheri")
  let best: Phrase | null = null;
  for (const p of phrases) {
    if (hasPhrase(text, p.text) && (!best || p.text.length > best.text.length)) best = p;
  }
  if (best) {
    return result(inputText, { method: "ALIAS", confidence: 0.95, locality: best.loc, typedPincode, matchedText: best.text });
  }
  // 2b. Base name without a direction ("andheri" → Andheri West centroid, lower confidence)
  let bestBase: Phrase | null = null;
  for (const p of phrases) {
    if (p.hasDirection && hasPhrase(text, p.base) && (!bestBase || p.base.length > bestBase.base.length)) bestBase = p;
  }
  if (bestBase) {
    const loc = pickForBase(phrases, bestBase.base, null)!;
    return result(inputText, {
      method: "ALIAS",
      confidence: 0.9,
      locality: loc,
      typedPincode,
      matchedText: bestBase.base,
      note: "Side (east/west) not given — used the main area",
    });
  }

  const clean = cleanText([address, input.city].filter(Boolean).join(" "));
  // 3. Region keyword outside the service area (a state name beats a fuzzy guess: "Jaipur, Rajasthan" ≠ Raipur)
  for (const region of OUT_OF_AREA_REGIONS) {
    const word = region.words.find((w) => hasPhrase(clean, w));
    if (word) {
      return result(inputText, {
        kind: "REGION",
        method: "ALIAS",
        confidence: 0.6,
        typedPincode,
        matchedText: word,
        label: region.label,
        note: `Mentions ${region.label} — outside service area`,
      });
    }
  }

  // 4. Fuzzy: Jaro-Winkler on 1–3-word n-grams vs base names; the typed direction is applied exactly
  const words = tokens.map((t, i) => ({ t, i })).filter(({ t }) => !DIRECTIONS.has(t) && !/\d/.test(t));
  const bases = [...new Set(phrases.map((p) => p.base))].filter((b) => b.replace(/ /g, "").length >= MIN_FUZZY_LEN);
  let fuzzy: { score: number; base: string; gram: string; lastIndex: number; loc: LocalityRef } | null = null;
  for (let n = 1; n <= 3; n++) {
    for (let s = 0; s + n <= words.length; s++) {
      const slice = words.slice(s, s + n);
      if (slice.some((w) => w.t.length < 3)) continue;
      const gram = slice.map((w) => w.t).join(" ");
      if (gram.replace(/ /g, "").length < MIN_FUZZY_LEN) continue;
      const lastIndex = slice[slice.length - 1].i;
      const next = tokens[lastIndex + 1];
      const direction = next && DIRECTIONS.has(next) ? next : null;
      for (const base of bases) {
        if (Math.abs(base.length - gram.length) > 4) continue;
        const score = jaroWinkler(gram, base);
        if (score < threshold) continue;
        const loc = pickForBase(phrases, base, direction);
        if (!loc) continue;
        const better =
          !fuzzy || score > fuzzy.score + 1e-9 || (Math.abs(score - fuzzy.score) <= 1e-9 && preferLocality(loc, fuzzy.loc) === loc && loc !== fuzzy.loc);
        if (better) fuzzy = { score, base, gram, lastIndex, loc };
      }
    }
  }
  if (fuzzy) {
    return result(inputText, {
      method: "FUZZY",
      confidence: Math.round(fuzzy.score * 100) / 100,
      locality: fuzzy.loc,
      typedPincode,
      matchedText: tokens[fuzzy.lastIndex + 1] && DIRECTIONS.has(tokens[fuzzy.lastIndex + 1]) ? `${fuzzy.gram} ${tokens[fuzzy.lastIndex + 1]}` : fuzzy.gram,
    });
  }

  // 5. City-level fallback (city words are never aliases)
  for (const fb of CITY_FALLBACKS) {
    if (!hasPhrase(clean, fb.word)) continue;
    if (!fb.locality) return result(inputText, { typedPincode, matchedText: fb.word, note: fb.note });
    const loc = localities.find((l) => l.name === fb.locality);
    if (loc) return result(inputText, { method: "ALIAS", confidence: fb.confidence, locality: loc, typedPincode, matchedText: fb.word, note: fb.note });
  }

  return result(inputText, { typedPincode, note: typedPincode ? `Pincode ${typedPincode} is not on our map` : "Couldn't recognise the area" });
}
