// Seed gazetteer (02_REFERENCE_DATA §4, §10). Approximate centroids, good enough for branch routing.
// Never add the demo misspellings (borivalli, goregoan, kandiwali, ghatkoper) as aliases.

export interface GazetteerEntry {
  name: string;
  city: string;
  pincode: string | null;
  lat: number;
  lng: number;
  aliases: string[];
}

export interface BranchSeed {
  code: string;
  name: string;
  shortName: string;
  kind: "EXPERIENCE_CENTRE" | "ONLINE_DESK";
  city: string;
  area: string;
  lat: number | null;
  lng: number | null;
  serviceRadiusKm: number;
  assignmentStrategy: "ROUND_ROBIN" | "LEAST_OPEN_LEADS";
}

export const BRANCHES: BranchSeed[] = [
  { code: "ONL", name: "Online Desk", shortName: "Online Desk", kind: "ONLINE_DESK", city: "Mumbai", area: "Central pre-sales", lat: null, lng: null, serviceRadiusKm: 0, assignmentStrategy: "ROUND_ROBIN" },
  { code: "WOR", name: "Worli Experience Centre", shortName: "Worli", kind: "EXPERIENCE_CENTRE", city: "Mumbai", area: "Worli, Mumbai 400018", lat: 19.0176, lng: 72.8162, serviceRadiusKm: 30, assignmentStrategy: "ROUND_ROBIN" },
  { code: "AND", name: "Andheri Experience Centre", shortName: "Andheri", kind: "EXPERIENCE_CENTRE", city: "Mumbai", area: "Andheri West, Mumbai 400053", lat: 19.1364, lng: 72.8296, serviceRadiusKm: 30, assignmentStrategy: "ROUND_ROBIN" },
  { code: "TAR", name: "Tardeo Experience Centre", shortName: "Tardeo", kind: "EXPERIENCE_CENTRE", city: "Mumbai", area: "Tardeo, Mumbai 400034", lat: 18.969, lng: 72.815, serviceRadiusKm: 25, assignmentStrategy: "LEAST_OPEN_LEADS" },
  { code: "PUN", name: "Pune Experience Centre", shortName: "Pune", kind: "EXPERIENCE_CENTRE", city: "Pune", area: "Ganj Peth, Pune 411042", lat: 18.503, lng: 73.867, serviceRadiusKm: 25, assignmentStrategy: "ROUND_ROBIN" },
];

export const PINCODE_RULES: { pincode: string; label: string; branchCode: string }[] = [
  { pincode: "400703", label: "Vashi", branchCode: "WOR" },
  { pincode: "400706", label: "Nerul", branchCode: "WOR" },
  { pincode: "400614", label: "CBD Belapur", branchCode: "WOR" },
  { pincode: "410210", label: "Kharghar", branchCode: "WOR" },
  { pincode: "400708", label: "Airoli", branchCode: "WOR" },
  { pincode: "400701", label: "Ghansoli", branchCode: "WOR" },
];

const e = (name: string, city: string, pincode: string | null, lat: number, lng: number, aliases: string[] = []): GazetteerEntry => ({
  name,
  city,
  pincode,
  lat,
  lng,
  aliases,
});

export const LOCALITIES: GazetteerEntry[] = [
  // Mumbai, Thane, Navi Mumbai (§10.1)
  e("Colaba", "Mumbai", "400005", 18.9067, 72.8147, ["cuffe parade"]),
  e("Fort", "Mumbai", "400001", 18.9345, 72.8356, ["ballard estate", "cst"]),
  e("Churchgate", "Mumbai", "400020", 18.9322, 72.8264, ["marine lines", "marine drive"]),
  e("Walkeshwar", "Mumbai", "400006", 18.9467, 72.7953, ["teen batti", "banganga"]),
  e("Malabar Hill", "Mumbai", "400006", 18.9548, 72.7985, ["nepean sea road", "napean sea road"]),
  e("Peddar Road", "Mumbai", "400026", 18.9686, 72.8081, ["pedder road", "cumballa hill", "kemps corner"]),
  e("Breach Candy", "Mumbai", "400026", 18.972, 72.8045, ["warden road"]),
  e("Tardeo", "Mumbai", "400034", 18.969, 72.815, ["haji ali"]),
  e("Grant Road", "Mumbai", "400007", 18.9633, 72.8159, ["nana chowk"]),
  e("Byculla", "Mumbai", "400027", 18.9767, 72.8326, ["byculla west", "byculla east"]),
  e("Mahalaxmi", "Mumbai", "400011", 18.9827, 72.824, ["jacob circle"]),
  e("Lower Parel", "Mumbai", "400013", 18.9953, 72.83, ["kamala mills", "phoenix mills"]),
  e("Parel", "Mumbai", "400012", 19.0, 72.84, ["parel east"]),
  e("Worli", "Mumbai", "400018", 19.0176, 72.8162, ["worli sea face", "worli naka"]),
  e("Prabhadevi", "Mumbai", "400025", 19.0166, 72.8295, ["century bazaar"]),
  e("Dadar West", "Mumbai", "400028", 19.0213, 72.8424, ["shivaji park", "dadar w"]),
  e("Dadar East", "Mumbai", "400014", 19.0178, 72.8478, ["hindu colony", "dadar e"]),
  e("Matunga", "Mumbai", "400019", 19.027, 72.857, ["kings circle", "king's circle"]),
  e("Mahim", "Mumbai", "400016", 19.041, 72.84),
  e("Sion", "Mumbai", "400022", 19.039, 72.8619, ["sion west", "sion east"]),
  e("Wadala", "Mumbai", "400031", 19.0219, 72.8644, ["wadala east", "wadala west"]),
  e("Chembur", "Mumbai", "400071", 19.0522, 72.9005, ["chembur east", "chembur west"]),
  e("Deonar", "Mumbai", "400088", 19.05, 72.913, ["chembur deonar"]),
  e("Tilak Nagar", "Mumbai", "400089", 19.066, 72.892),
  e("Kurla", "Mumbai", "400070", 19.0726, 72.8845, ["kurla west", "kurla east"]),
  e("Ghatkopar East", "Mumbai", "400077", 19.079, 72.908, ["ghatkopar e"]),
  e("Ghatkopar West", "Mumbai", "400086", 19.088, 72.9, ["ghatkopar w"]),
  e("Vikhroli", "Mumbai", "400083", 19.111, 72.928, ["vikhroli east", "vikhroli west"]),
  e("Powai", "Mumbai", "400076", 19.1176, 72.906, ["hiranandani gardens", "hiranandani"]),
  e("Bhandup", "Mumbai", "400078", 19.143, 72.937, ["bhandup west", "bhandup east"]),
  e("Mulund West", "Mumbai", "400080", 19.1726, 72.9425, ["mulund w"]),
  e("Mulund East", "Mumbai", "400081", 19.17, 72.96, ["mulund e"]),
  e("Bandra West", "Mumbai", "400050", 19.0596, 72.8295, ["bandra w", "pali hill", "carter road"]),
  e("Bandra Kurla Complex", "Mumbai", "400051", 19.066, 72.868, ["bkc", "bandra east"]),
  e("Khar West", "Mumbai", "400052", 19.07, 72.836, ["khar w"]),
  e("Santacruz West", "Mumbai", "400054", 19.081, 72.838, ["santacruz w"]),
  e("Santacruz East", "Mumbai", "400055", 19.08, 72.854, ["santacruz e", "kalina"]),
  e("Vile Parle East", "Mumbai", "400057", 19.099, 72.849, ["vile parle", "parle east"]),
  e("Juhu", "Mumbai", "400049", 19.1075, 72.8263, ["juhu tara road"]),
  e("JVPD", "Mumbai", "400049", 19.107, 72.837, ["jvpd scheme"]),
  e("Andheri West", "Mumbai", "400053", 19.1364, 72.8296, ["andheri w", "lokhandwala", "versova", "four bungalows"]),
  e("Andheri East", "Mumbai", "400069", 19.1197, 72.8468, ["andheri e", "marol", "chakala"]),
  e("Jogeshwari West", "Mumbai", "400102", 19.14, 72.848, ["jogeshwari", "oshiwara"]),
  e("Goregaon East", "Mumbai", "400063", 19.165, 72.858, ["goregaon e", "oberoi mall", "film city"]),
  e("Goregaon West", "Mumbai", "400104", 19.164, 72.849, ["goregaon w"]),
  e("Malad West", "Mumbai", "400064", 19.187, 72.848, ["malad w", "malad"]),
  e("Malad East", "Mumbai", "400097", 19.186, 72.86, ["malad e"]),
  e("Kandivali West", "Mumbai", "400067", 19.204, 72.852, ["kandivali w"]),
  e("Kandivali East", "Mumbai", "400101", 19.205, 72.87, ["kandivali e", "thakur village"]),
  e("Borivali West", "Mumbai", "400092", 19.2307, 72.8567, ["borivali w", "borivali"]),
  e("Borivali East", "Mumbai", "400066", 19.229, 72.865, ["borivali e"]),
  e("Dahisar", "Mumbai", "400068", 19.25, 72.859, ["dahisar east", "dahisar west"]),
  e("Mira Road", "Mira-Bhayandar", "401107", 19.281, 72.871, ["mira bhayandar"]),
  e("Thane West", "Thane", "400601", 19.2183, 72.9781, ["thane w", "majiwada"]),
  e("Ghodbunder Road", "Thane", "400615", 19.26, 72.97, ["ghodbunder", "gb road"]),
  e("Dombivli", "Thane", "421201", 19.2183, 73.0867, ["dombivli east", "dombivli west"]),
  e("Vashi", "Navi Mumbai", "400703", 19.0771, 72.9986, ["vashi sector"]),
  e("Nerul", "Navi Mumbai", "400706", 19.033, 73.018, ["seawoods"]),
  e("CBD Belapur", "Navi Mumbai", "400614", 19.023, 73.04, ["belapur"]),
  e("Kharghar", "Navi Mumbai", "410210", 19.047, 73.07),
  e("Airoli", "Navi Mumbai", "400708", 19.159, 72.998),
  e("Ghansoli", "Navi Mumbai", "400701", 19.119, 73.001),
  // Pune (§10.2)
  e("Ganj Peth", "Pune", "411042", 18.503, 73.867, ["pune city", "timber market"]),
  e("Kothrud", "Pune", "411038", 18.5074, 73.8077),
  e("Baner", "Pune", "411045", 18.559, 73.7868, ["baner road"]),
  e("Aundh", "Pune", "411007", 18.558, 73.8075),
  e("Wakad", "Pune", "411057", 18.599, 73.762, ["pune wakad"]),
  e("Pimple Saudagar", "Pune", "411027", 18.599, 73.798, ["pimple saudagar pune"]),
  e("Hinjewadi", "Pune", "411057", 18.591, 73.7389, ["hinjawadi"]),
  e("Koregaon Park", "Pune", "411001", 18.5362, 73.894, ["pune camp"]),
  e("Viman Nagar", "Pune", "411014", 18.5679, 73.9143),
  e("Kharadi", "Pune", "411014", 18.551, 73.94),
  e("Hadapsar", "Pune", "411028", 18.5089, 73.926, ["magarpatta"]),
  // Known places outside the service area (§10.4) — routing decides by distance
  e("Panvel", "Raigad, MH", "410206", 18.9894, 73.1175, ["new panvel"]),
  e("Kalyan", "Thane, MH", "421301", 19.2437, 73.1355, ["kalyan west", "kalyan east"]),
  e("Virar", "Palghar, MH", "401303", 19.4559, 72.8114),
  e("Alibaug", "Raigad, MH", "402201", 18.6414, 72.8722, ["alibag"]),
  e("Lonavala", "Pune, MH", "410401", 18.7546, 73.4062),
  e("Nashik", "Nashik, MH", "422001", 19.9975, 73.7898),
  e("Ratnagiri", "Ratnagiri, MH", "415612", 16.9902, 73.312),
  e("Surat", "Gujarat", "395001", 21.1702, 72.8311),
  e("Hyderabad", "Telangana", "500032", 17.415, 78.34, ["financial district", "gachibowli"]),
  e("Raipur", "Chhattisgarh", "492001", 21.2514, 81.6296),
  e("Ahmedabad", "Gujarat", "380001", 23.0225, 72.5714),
  e("Bengaluru", "Karnataka", "560001", 12.9716, 77.5946, ["bangalore"]),
  e("Delhi", "Delhi", "110001", 28.6139, 77.209, ["new delhi"]),
  e("Panaji", "Goa", "403001", 15.4909, 73.8278, ["panjim"]),
  e("Nagpur", "Maharashtra", "440001", 21.1458, 79.0882),
  e("Indore", "Madhya Pradesh", "452001", 22.7196, 75.8577),
];

// §10.3 — used ONLY when nothing else matched. City words are never aliases.
export const CITY_FALLBACKS: { word: string; locality: string | null; confidence: number; note: string }[] = [
  { word: "navi mumbai", locality: "Vashi", confidence: 0.7, note: "Navi Mumbai — area not specified" },
  { word: "pune", locality: "Ganj Peth", confidence: 0.7, note: "Pune — area not specified" },
  { word: "thane", locality: "Thane West", confidence: 0.7, note: "Thane — area not specified" },
  { word: "mumbai", locality: null, confidence: 0, note: "City only — ask for area" },
  { word: "bombay", locality: null, confidence: 0, note: "City only — ask for area" },
];

// §10.4 region keyword fallback → OUT_OF_AREA with no distance
export const OUT_OF_AREA_REGIONS: { words: string[]; label: string }[] = [
  { words: ["gujarat"], label: "Gujarat" },
  { words: ["karnataka"], label: "Karnataka" },
  { words: ["telangana"], label: "Telangana" },
  { words: ["chhattisgarh", "chattisgarh"], label: "Chhattisgarh" },
  { words: ["madhya pradesh", "mp"], label: "Madhya Pradesh" },
  { words: ["delhi"], label: "Delhi" },
  { words: ["goa"], label: "Goa" },
  { words: ["rajasthan"], label: "Rajasthan" },
  { words: ["uttar pradesh", "up"], label: "Uttar Pradesh" },
  { words: ["kerala"], label: "Kerala" },
  { words: ["tamil nadu"], label: "Tamil Nadu" },
  { words: ["west bengal"], label: "West Bengal" },
  { words: ["punjab"], label: "Punjab" },
  { words: ["haryana"], label: "Haryana" },
  { words: ["dubai"], label: "Dubai" },
  { words: ["usa"], label: "USA" },
  { words: ["uk"], label: "UK" },
];

export const branchShortName = (code: string) => BRANCHES.find((b) => b.code === code)?.shortName ?? code;
