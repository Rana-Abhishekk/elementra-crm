// Synthetic pools (02_REFERENCE_DATA §9.5). Deliberately avoid every first name in the client's sheet.
import type { LeadSource } from "@prisma/client";

export const FIRST_NAMES = [
  "Rhea", "Aditya", "Kavya", "Nikhil", "Pooja", "Aniket", "Ruhi", "Varun", "Ritika", "Kunal", "Kriti", "Rahul", "Aisha", "Pranav", "Tanya",
  "Vikram", "Isha", "Karan", "Nandini", "Sahil", "Zoya", "Manish", "Priya", "Sameer", "Aditi", "Yash", "Simran", "Abhay", "Naina", "Gaurav",
  "Fatima", "Akash", "Mitali", "Parth", "Shreya", "Imran", "Radhika", "Tejas", "Meher", "Arnav", "Lavanya", "Dhruv", "Sanya", "Jay", "Tara",
  "Neel", "Ira", "Kabir", "Mahima", "Ishaan",
] as const;

const FEMALE = new Set(["Rhea", "Kavya", "Pooja", "Ruhi", "Ritika", "Kriti", "Aisha", "Tanya", "Isha", "Nandini", "Zoya", "Priya", "Aditi", "Simran", "Naina", "Fatima", "Mitali", "Shreya", "Radhika", "Meher", "Lavanya", "Sanya", "Tara", "Ira", "Mahima"]);

export const LAST_NAMES = [
  "Kapoor", "Shah", "Mehta", "Iyer", "Nair", "Desai", "Patel", "Joshi", "Kulkarni", "Rao", "Sharma", "Gupta", "Malhotra", "Menon", "Pillai",
  "Bhatt", "Chopra", "Fernandes", "D'Souza", "Shaikh", "Khan", "Jain", "Agarwal", "Banerjee", "Sawant", "Pawar", "Gokhale", "Thakkar", "Vora", "Sethi",
] as const;

export const salutationFor = (first: string, married = false) => (FEMALE.has(first) ? (married ? "Mrs" : "Ms") : "Mr");

export const SOCIETIES = [
  "Sea View Heights", "Palm Residency", "Orchid Towers", "Lakeview Enclave", "Harbour Crest", "Sunrise Park", "Green Acres", "Skyline Residency",
  "Riverdale Apartments", "Silver Oak CHS",
] as const;

// Inputs only — never aliases (§10.4)
export const MISSPELLINGS: Record<string, string> = {
  "Borivali West": "Borivalli west",
  "Goregaon East": "Goregoan east",
  "Kandivali East": "Kandiwali east",
  "Ghatkopar West": "Ghatkoper west",
  "Andheri West": "Andheri (W)",
  Vashi: "Navi mumbai vashi",
  Powai: "Powai hiranandani",
  "Ghodbunder Road": "Thane - Ghodbunder",
  "Malad West": "Malad mumbai",
};

export const syntheticPhone = (n: number) => `+9190000${String(n).padStart(5, "0")}`;
export const syntheticEmail = (first: string, last: string, n: number) =>
  `${first}.${last}${n}`.toLowerCase().replace(/[^a-z0-9.]/g, "") + "@example.com";

export const CAMPAIGN_ADSETS = ["Mumbai 30+ – Real estate & architects interests", "Mumbai 30+ – Lookalike 2%", "Pune 30+ – New home buyers"] as const;
export const CAMPAIGN_ADS = ["Trust – Reel", "Kitchen walkthrough – Carousel", "Wardrobe finishes – Static", "Showroom tour – Reel"] as const;
export const CAMPAIGN_FORM = "Lead form – Bespoke products V4";
export const campaignForMonth = (monthName: string) => `Elementra – Leads – ${monthName} 2026`;

export const SOURCE_WEIGHTS: readonly (readonly [LeadSource, number])[] = [
  ["INSTAGRAM_PAID", 70], ["FACEBOOK", 8], ["INSTAGRAM_ORGANIC", 4], ["WEBSITE", 6], ["WHATSAPP", 4], ["GOOGLE", 3], ["REFERENCE", 3], ["WALK_IN", 1], ["CALL", 1],
];

export const NOTE_SNIPPETS = [
  "Spoke to client. {{bhk}} at {{area}}, possession in {{month}}. Wants a parallel kitchen with maximum storage.",
  "Prefers warm, neutral tones. No PU finish; open to veneer and glass.",
  "Will share the floor plan on WhatsApp today; wants a ballpark first.",
  "Visited {{branch}} experience centre with spouse. Liked ceramic shutters, worried about budget.",
  "Shared revised ballpark in two finishes (laminate / acrylic).",
  "Did not answer. Will try again in the evening.",
  "Asked to call back after the festival week.",
  "Architect {{architect}} is involved; they will visit the showroom together next week.",
  "Wants turnkey including civil work; indicative budget ₹{{budget}} L.",
  "Possession delayed to {{month}} — follow up a month before.",
  "Comparing with two other vendors. Quotation sent, awaiting feedback.",
  "Wants appliances (hob + chimney) quoted along with the kitchen.",
  "Site is a bare-shell flat; plans to rent it out. Wants durable, low-maintenance finishes.",
  "Measurement visit done. Drawings to be shared by {{weekday}}.",
  "Negotiating on finish upgrade; token expected this week.",
  "Token received. Moving to production measurement.",
  "Client travelling, back on {{date}}.",
  "Only interested in wardrobes for now; kitchen next year.",
  "Requested a video call before visiting the showroom.",
  "Budget is lower than our range; shared a compact-kitchen option.",
] as const;

export function fillSnippet(s: string, vars: Record<string, string>) {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
}
