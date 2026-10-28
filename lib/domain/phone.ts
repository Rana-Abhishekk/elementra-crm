// Phone normalisation (spec §8.6). Output is E.164; Indian numbers become +91XXXXXXXXXX.

export interface NormalisedPhone {
  e164: string;
  isInternational: boolean;
}

/** Split a cell that may hold several numbers ("9000012345,\n9000067890", "… or …", "… / …"). */
export function splitPhones(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/,|\/|\n|;|\bor\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normalisePhone(raw: string | null | undefined): NormalisedPhone | null {
  if (!raw) return null;
  let s = raw.trim().replace(/^p:/i, "").trim();
  // "(+1)5550142233" → "+15550142233"
  s = s.replace(/^\(\+(\d{1,3})\)/, "+$1");
  const hasPlus = s.startsWith("+");
  let digits = s.replace(/\D/g, "");
  if (!digits) return null;

  if (hasPlus) {
    if (digits.startsWith("91") && digits.length === 12) return { e164: `+${digits}`, isInternational: false };
    if (digits.length >= 8 && digits.length <= 15) return { e164: `+${digits}`, isInternational: true };
    return null;
  }
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    return { e164: `+${digits}`, isInternational: false };
  }
  if (digits.length === 10 && /^[6-9]/.test(digits)) return { e164: `+91${digits}`, isInternational: false };
  // 00-prefixed international
  if (digits.startsWith("00") && digits.length >= 10 && digits.length <= 17) {
    return { e164: `+${digits.slice(2)}`, isInternational: !digits.startsWith("0091") };
  }
  return null;
}

/** Primary + alternate from one raw cell. */
export function parsePhones(raw: string | null | undefined): { primary: NormalisedPhone | null; alt: NormalisedPhone | null } {
  const parts = splitPhones(raw)
    .map(normalisePhone)
    .filter((p): p is NormalisedPhone => p !== null);
  return { primary: parts[0] ?? null, alt: parts[1] ?? null };
}

/** "+919000012345" → "+91 90000 12345" */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "—";
  const m = e164.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

/** wa.me wants digits only, with country code */
export function waLink(e164: string, text?: string): string {
  const digits = e164.replace(/\D/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
