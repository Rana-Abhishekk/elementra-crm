// {{var}} rendering for WhatsApp templates. Unknown variables render as empty strings.
export function renderTemplate(body: string, vars: Record<string, string | null | undefined>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "").replace(/ {2,}/g, " ");
}

export const SAMPLE_VARS: Record<string, string> = {
  name: "Rhea",
  product: "kitchen and wardrobes",
  branch: "Worli",
  rep_name: "Ishita Desai",
  date: "29 Oct",
  time: "11:00 AM",
  host_name: "Ishita Desai",
  map_link: "https://maps.google.com/?q=19.0176,72.8162",
  location: "Surat",
};
