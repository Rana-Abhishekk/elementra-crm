// Text cleanup for location matching (spec §8.2).

const NOISE = new Set([
  "flat", "flats", "tower", "towers", "wing", "near", "opp", "opposite", "building", "bldg", "road", "rd",
  "mumbai", "maharashtra", "india", "no", "plot", "floor", "apt", "apartment", "chs", "society", "the", "at", "in",
]);

export const DIRECTIONS = new Set(["east", "west"]);

/** Lowercase, expand (w)/(e) and lone w/e to west/east, strip punctuation, collapse spaces. */
export function cleanText(input: string): string {
  return ` ${input.toLowerCase()} `
    .replace(/\(\s*w(est)?\s*\)/g, " west ")
    .replace(/\(\s*e(ast)?\s*\)/g, " east ")
    .replace(/'/g, "")
    .replace(/[^a-z0-9ऀ-ॿ]+/g, " ")
    .replace(/ w(?= )/g, " west")
    .replace(/ e(?= )/g, " east")
    .replace(/\s+/g, " ")
    .trim();
}

/** cleanText minus noise words (flat, tower, road, mumbai, …). Used for matching. */
export function coreText(input: string): string {
  return cleanText(input)
    .split(" ")
    .filter((t) => t && !NOISE.has(t))
    .join(" ");
}

export function stripDirections(phrase: string): string {
  return phrase
    .split(" ")
    .filter((t) => !DIRECTIONS.has(t))
    .join(" ");
}

/** Contains `phrase` as whole words */
export function hasPhrase(text: string, phrase: string): boolean {
  return phrase.length > 0 && ` ${text} `.includes(` ${phrase} `);
}

const EMPTY = new Set(["", "na", "n a", "none", "nil", "not available", "multiple projects", "tbd", "0"]);

export function isEmptyLocation(input: string | null | undefined): boolean {
  if (!input) return true;
  return EMPTY.has(cleanText(input));
}

export function extractPincode(...texts: (string | null | undefined)[]): string | null {
  for (const t of texts) {
    const m = t?.match(/\b[1-9][0-9]{5}\b/);
    if (m) return m[0];
  }
  return null;
}
