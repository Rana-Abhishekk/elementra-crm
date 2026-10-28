# Elementra CRM — Reference Data

> Companion to `01_PRODUCT_AND_DEMO_SPEC.md`. Everything here goes into enums, seed files or fixtures.
> **All people, phones and emails in this file are synthetic.** Do not use any row from the client's Excel in code, seed, tests or screenshots.

---

## 1. Pipeline stages (client's own wording)

| Order | Enum | Label shown in UI | Group | Badge colour |
|---|---|---|---|---|
| 1 | `NEW` | 1. New Lead / Inquiry | Open | slate |
| 2 | `CONTACTED` | 2. Contacted | Open | sky |
| 3 | `QUALIFIED` | 3. Lead Qualified | Open | blue |
| 4 | `DISCOVERY_MEETING` | 4. Discovery / Requirement Meeting | Open | indigo |
| 5 | `QUOTATION_REQUESTED` | 5. Quotation Requested | Open | violet |
| 6 | `QUOTATION_SENT` | 6. Quotation Sent | Open | purple |
| 7 | `NEGOTIATION` | 7. Negotiations | Open | amber |
| 8 | `TOKEN_RECEIVED` | 8. Token Received | Open | orange |
| 9 | `CLOSED_WON` | 9. Closed Won | Won | green |
| 10 | `CLOSED_LOST` + reason | Closed Lost – {reason} | Lost | red/grey |

**Lost reasons** (`LostReason`), from the client's dropdown:

| Enum | Label | Client's original value |
|---|---|---|
| `BUDGET` | Budget | 10.Closed Lost - Budget |
| `COMPETITOR` | Competitor | 10.Closed Lost - Competitor |
| `TIMELINE` | Timeline | 11.Closed Lost - Timeline |
| `NO_RESPONSE` | No response | 12.Closed Lost - No response |
| `ON_HOLD` | On hold | 13.Closed Lost - On Hold |
| `OTHERS` | Others | 14. Closed Lost - Others |

Allowed transitions: any open stage → any later open stage, one step back (corrections), or Won/Lost. Won/Lost → "Reopen" sends it back to the last open stage (OWNER/ADMIN/MANAGER only). Every transition writes `STAGE_CHANGE` + AuditLog.

**Importing legacy strings:** match on the text after the number, ignoring spaces, dots and case. "14. Closed Lost - Others" and "14.Closed Lost - Others" both map to `CLOSED_LOST/OTHERS`.

---

## 2. Sources and intake channels

**Marketing source** (`LeadSource`): what the client reports on.

| Enum | Label | Client sheet values that map here |
|---|---|---|
| `INSTAGRAM_PAID` | Instagram (Paid) | "Instagram Paid Media", "Instagram Paid Media Paid Media" (typo in their sheet) |
| `INSTAGRAM_ORGANIC` | Instagram (Organic) | "Instagram Organic" |
| `FACEBOOK` | Facebook | "Facebook" |
| `GOOGLE` | Google | "Google" |
| `WHATSAPP` | WhatsApp | "Whatsapp" |
| `LINKEDIN` | LinkedIn | "Linkedin" |
| `REFERENCE` | Reference / Architect | "Reference" |
| `REPEAT_PURCHASE` | Repeat purchase | "Repeat purchase" |
| `WALK_IN` | Walk-in | "Walkins" |
| `CALL` | Phone call | "Call" |
| `WEBSITE` | Website | (new) |

**Intake channel** (`IntakeChannel`): how the record entered the system. `META_LEAD_AD`, `WEBSITE_FORM`, `WHATSAPP`, `GOOGLE_SHEET`, `CSV_IMPORT`, `MANUAL`.

Meta mapping: `platform = "ig"` → `INSTAGRAM_PAID` (or `INSTAGRAM_ORGANIC` if `is_organic = true`); `platform = "fb"` → `FACEBOOK`.

---

## 3. Products

| Enum | Label | Meta form answer (custom question `elementra_bespoke_products_you_are_looking_for`) |
|---|---|---|
| `KITCHEN` | Kitchen | `elementra_kitchens` *(confirmed in their export)* |
| `WARDROBES` | Wardrobes | `elementra_wardrobes` *(assumed — confirm)* |
| `FURNITURE` | Furniture | `elementra_furniture` *(assumed)* |
| `APPLIANCES` | Appliances | `elementra_appliances` *(assumed)* |
| `BEDS` | Beds | `elementra_beds` *(assumed)* |
| `OTHERS` | Others | anything else |

The client's sheet stores multiples as "Kitchen, Wardrobes, Furniture". Split on commas.

---

## 4. Branches & routing rules

| Code | Name | Kind | Area label | Lat | Lng | Radius km | Strategy |
|---|---|---|---|---|---|---|---|
| `ONL` | Online Desk | ONLINE_DESK | Central pre-sales | — | — | — | ROUND_ROBIN |
| `WOR` | Worli Experience Centre | EXPERIENCE_CENTRE | Worli, Mumbai 400018 | 19.0176 | 72.8162 | 30 | ROUND_ROBIN |
| `AND` | Andheri Experience Centre | EXPERIENCE_CENTRE | Andheri West, Mumbai 400053 | 19.1364 | 72.8296 | 30 | ROUND_ROBIN |
| `TAR` | Tardeo Experience Centre | EXPERIENCE_CENTRE | Tardeo, Mumbai 400034 | 18.9690 | 72.8150 | 25 | LEAST_OPEN_LEADS |
| `PUN` | Pune Experience Centre | EXPERIENCE_CENTRE | Ganj Peth, Pune 411042 | 18.5030 | 73.8670 | 25 | ROUND_ROBIN |

Coordinates are area centroids for the demo. The client will give exact showroom pins during discovery.

**Seeded pincode rules** (demo assumption: "Navi Mumbai is handled by Worli"; confirm in the Rules Sheet):

| Pincode | Area | Branch |
|---|---|---|
| 400703 | Vashi | WOR |
| 400706 | Nerul | WOR |
| 400614 | CBD Belapur | WOR |
| 410210 | Kharghar | WOR |
| 400708 | Airoli | WOR |
| 400701 | Ghansoli | WOR |

Without these rules, distance would send Vashi/Airoli/Ghansoli to Andheri. The rule overriding distance is a deliberate demo moment.

---

## 5. Demo users

Password for all demo users: **`Demo@1234`** (seeded only when `DEMO_MODE=true`). The `SEED_ADMIN_*` user stays as ADMIN.

| Name | Email | Role | Branch | Receives leads |
|---|---|---|---|---|
| Aarav Mehta | aarav@elementra.test | OWNER | — | no |
| Ananya Rao | ananya@elementra.test | PRESALES | ONL | yes |
| Sara Khan | sara@elementra.test | PRESALES | ONL | yes |
| Kabir Malhotra | kabir@elementra.test | SALES_MANAGER | WOR | no |
| Ishita Desai | ishita@elementra.test | SALES_REP | WOR | yes |
| Rohan Pillai | rohan@elementra.test | SALES_REP | WOR | yes |
| Farah Siddiqui | farah@elementra.test | SALES_MANAGER | AND | no |
| Arjun Nair | arjun@elementra.test | SALES_REP | AND | yes |
| Meera Joshi | meera@elementra.test | SALES_REP | AND | yes |
| Tanvi Shah | tanvi@elementra.test | SALES_MANAGER | TAR | yes (small team) |
| Dev Bhatia | dev@elementra.test | SALES_REP | TAR | yes |
| Sneha Kulkarni | sneha@elementra.test | SALES_MANAGER | PUN | yes (small team) |
| Omkar Patil | omkar@elementra.test | SALES_REP | PUN | yes |

Quick-login chips on the login page: Owner (Aarav) · Online Desk (Ananya) · Worli Manager (Kabir) · Andheri Rep (Arjun) · Pune Rep (Omkar).

The "Rep on leave" scenario uses **Arjun Nair**.

---

## 6. WhatsApp message templates (seed)

Variables: `{{name}}`, `{{product}}`, `{{branch}}`, `{{rep_name}}`, `{{date}}`, `{{time}}`, `{{host_name}}`, `{{map_link}}`, `{{location}}`.
`{{branch}}` renders as the short name ("Worli"). `{{product}}` renders as lowercase joined ("kitchen and wardrobes").

| Code | Lang | Category | Status (simulated) | Body |
|---|---|---|---|---|
| `welcome_enquiry` | en | UTILITY | APPROVED | Hi {{name}}, thank you for your interest in Elementra {{product}}. {{rep_name}} from our {{branch}} Experience Centre will call you shortly. If you have a floor plan, feel free to share it here. |
| `welcome_enquiry` | hi | UTILITY | APPROVED | नमस्ते {{name}} जी, Elementra में आपकी रुचि के लिए धन्यवाद। हमारे {{branch}} एक्सपीरियंस सेंटर से {{rep_name}} जल्द ही आपको कॉल करेंगे। अगर आपके पास फ्लोर प्लान है, तो आप उसे यहीं भेज सकते हैं। |
| `welcome_no_location` | en | UTILITY | APPROVED | Hi {{name}}, thank you for contacting Elementra. Could you share your site's area or pincode? It helps us connect you with the nearest Experience Centre. |
| `welcome_no_location` | hi | UTILITY | APPROVED | नमस्ते {{name}} जी, Elementra से संपर्क करने के लिए धन्यवाद। कृपया अपनी साइट का एरिया या पिनकोड बताएं, ताकि हम आपको नज़दीकी एक्सपीरियंस सेंटर से जोड़ सकें। |
| `appointment_reminder` | en | UTILITY | APPROVED | Hi {{name}}, a gentle reminder of your visit to the Elementra {{branch}} Experience Centre on {{date}} at {{time}}. {{host_name}} will host you. Location: {{map_link}} |
| `appointment_reminder` | hi | UTILITY | APPROVED | नमस्ते {{name}} जी, याद दिला दें कि {{date}} को {{time}} बजे Elementra {{branch}} एक्सपीरियंस सेंटर में आपकी विज़िट तय है। {{host_name}} आपका स्वागत करेंगे। लोकेशन: {{map_link}} |
| `quotation_follow_up` | en | UTILITY | PENDING_APPROVAL | Hi {{name}}, did you get a chance to look at the quotation we shared on {{date}}? {{rep_name}} is happy to walk you through finish options that fit your budget. |
| `follow_up_nudge` | en | MARKETING | PENDING_APPROVAL | Hi {{name}}, checking in on your {{product}} plans. Would you like a quick estimate or a visit to our {{branch}} Experience Centre? Reply here and we'll set it up. |
| `close_the_loop` | en | UTILITY | DRAFT | Hi {{name}}, we've tried reaching you a few times. If you've decided to go another way, that's completely fine — a quick reply helps us close this on our side. If you'd still like to go ahead, just reply "Yes" and we'll call you. |
| `out_of_area_regret` | en | UTILITY | APPROVED | Hi {{name}}, thank you for considering Elementra. We currently serve Mumbai, Thane, Navi Mumbai and Pune, so we're unable to take up a project at {{location}} right now. We'll keep your details and reach out if we start serving your area. |
| `out_of_area_regret` | hi | UTILITY | APPROVED | नमस्ते {{name}} जी, Elementra में रुचि के लिए धन्यवाद। अभी हम मुंबई, ठाणे, नवी मुंबई और पुणे में सेवा देते हैं, इसलिए {{location}} में प्रोजेक्ट नहीं ले पाएंगे। हम आपकी जानकारी रखेंगे और आपके क्षेत्र में सेवा शुरू होने पर संपर्क करेंगे। |

Map links for `{{map_link}}`: use `https://maps.google.com/?q=<lat>,<lng>` from the branch coordinates. That's a plain link and needs no API key.

---

## 7. Meta Lead Ads formats

### 7.1 Webhook POST (what Meta sends) + demo extension

```json
{
  "object": "page",
  "entry": [{
    "id": "100000000000001",
    "time": 1761630000,
    "changes": [{
      "field": "leadgen",
      "value": {
        "leadgen_id": "SIM-1761630000-001",
        "page_id": "100000000000001",
        "form_id": "900000000000001",
        "ad_id": "120000000000001",
        "adgroup_id": "120000000000002",
        "created_time": 1761630000,
        "simulated_lead": { "...": "Graph lead object below — ONLY present for demo payloads" }
      }
    }]
  }]
}
```

Real Meta payloads carry only IDs. The real flow then fetches the lead from the Graph API by `leadgen_id`. In this milestone that fetch is a stub, and demo payloads embed `simulated_lead`.

### 7.2 Graph lead object (shape the mapper accepts)

```json
{
  "id": "SIM-1761630000-001",
  "created_time": "2026-10-28T06:42:11+0000",
  "ad_id": "120000000000001",
  "ad_name": "Leads Ad – Trust – Reel",
  "adset_id": "120000000000003",
  "adset_name": "Leads – Mumbai – 30+ : Real estate pages, architects",
  "campaign_id": "120000000000004",
  "campaign_name": "Elementra – Leads – Oct 2026",
  "form_id": "900000000000001",
  "is_organic": false,
  "platform": "ig",
  "field_data": [
    { "name": "full_name", "values": ["Rhea Kapoor"] },
    { "name": "phone_number", "values": ["+919000000123"] },
    { "name": "email", "values": ["rhea.kapoor@example.com"] },
    { "name": "elementra_bespoke_products_you_are_looking_for", "values": ["elementra_kitchens"] },
    { "name": "site_pincode", "values": ["400018"] },
    { "name": "possession_timeline", "values": ["within_3_months"] }
  ]
}
```

`site_pincode` and `possession_timeline` are **recommended new questions**; the client's current form doesn't ask them. The mapper must work with or without them.

### 7.3 Meta Leads Center CSV export (import format)

Columns, in the client's export order: `id, created_time, ad_id, ad_name, adset_id, adset_name, campaign_id, campaign_name, form_id, form_name, is_organic, platform, elementra_bespoke_products_you_are_looking_for, full_name, email, phone_number, lead_status` (+ the client added `Priority`).

Mapping rules:
- Strip type prefixes from IDs: `l:`, `ag:`, `as:`, `c:`, `f:`. Strip `p:` from phone values.
- `id` → `externalId` (dedupe on re-import).
- `created_time` is ISO with offset (e.g., `2026-10-06T10:05:14-05:00`) → parse to UTC → `receivedAt`.
- `full_name` → split on the first space into first/last name.
- `platform` + `is_organic` → source (see §2). `intakeChannel = CSV_IMPORT`.
- The product column maps per §3.
- `Priority` (if present: Hot/Warm/Cold, any case) → `priority`.
- Missing columns are fine. Unknown columns are kept in `rawPayload`.

Fixture: create `prisma/fixtures/meta-leads-sample.csv` with **15 synthetic rows** that cover: Worli pincode, a misspelt suburb in a free-text column, no location, a duplicate phone, the `p:` prefix, an `fb` platform row and an organic row.

---

## 8. Demo scenarios (Demo panel buttons)

Expected results assume the seed in this file and `routing.mode = DIRECT`. Distances are haversine from the branch centroids in §4.

| # | Button | Input (channel / source) | Address / pincode input | Expected result |
|---|---|---|---|---|
| 1 | Instagram ad — Worli flat | META_LEAD_AD / INSTAGRAM_PAID, campaign "Elementra – Leads – Oct 2026", product Kitchen | "Flat 1802, Worli Sea Face" + pincode 400018 | PINCODE → Worli locality → `NEAREST_IN_RADIUS` Worli 0.0 km → next WOR rep by round-robin; welcome sent (EN) |
| 2 | Misspelt suburb | WEBSITE_FORM / WEBSITE, products Kitchen + Wardrobes | "Flat 704, Palm Residency, goregoan east" | FUZZY Goregaon East (~0.98) → Andheri 4.4 km (Worli 17.0). *Keep landmark aliases (e.g., "oberoi mall") out of this input, or ALIAS would match first and the fuzzy matcher wouldn't show.* |
| 3 | Navi Mumbai pincode rule | WHATSAPP / WHATSAPP | "Sector 17, Vashi 400703" | `PINCODE_RULE` → Worli. Card shows Andheri 18.9 km, Worli 20.3 km, "rule wins over distance" |
| 4 | Pune enquiry | META_LEAD_AD / FACEBOOK, product Wardrobes | "Baner, Pune" | ALIAS Baner → Pune 10.5 km |
| 5 | Out of area — Surat | META_LEAD_AD / INSTAGRAM_PAID | "Adajan, Surat, Gujarat" | ALIAS Surat → `OUT_OF_AREA` (nearest Andheri 226 km) → Out-of-area queue |
| 6 | Borderline — Panvel | WEBSITE_FORM / WEBSITE | "New Panvel 410206" | PINCODE Panvel → `OUT_OF_AREA` 31.8 km from Worli (radius 30) → queue, labelled "Just outside radius" |
| 7 | No location (typical Meta form) | META_LEAD_AD / INSTAGRAM_PAID, product Kitchen | *(none)* | `NEEDS_LOCATION` → Online Desk (Ananya/Sara round-robin) → `CAPTURE_LOCATION` task; `welcome_no_location` sent |
| 8 | Returning customer | MANUAL / CALL | phone of an existing open seeded lead (pick one at runtime) | `RETURNING_SAME_OWNER` → same owner + branch; owner notified "Returning enquiry" |
| 9 | Night lead | META_LEAD_AD / INSTAGRAM_PAID | "Powai, Hiranandani" | `receivedAt` = today 23:40 IST (or yesterday if it's before 23:40 now) → Andheri 8.3 km → welcome sent immediately; FIRST_CALL due next day 11:00 IST |
| 10 | Rep on leave | MANUAL / WALK_IN | "Andheri West, Lokhandwala" | First sets Arjun Nair `onLeave = true`; result → Andheri, assigned to Meera Joshi; card lists "Skipped: Arjun Nair (on leave)" |
| + | 10 random leads | random mix by §9 weights | random | Burst of realistic leads; toast summary "7 routed, 2 need location, 1 out of area" |

Scenario names, phones and emails come from the synthetic pools in §9.5. Scenario 1's customer is always "Rhea Kapoor" so the presenter can find her quickly.

---

## 9. Synthetic demo history (generator spec)

Deterministic PRNG seed `20261028`. All dates are **relative to `now`** at generation time, so the demo always looks current.

### 9.1 Volume & spread
- **180 leads** created over the last **75 days**. Weekday volume is about 1.3× weekends. The last 7 days hold about 22 leads.
- Creation time: 70% between 10:00–22:00 IST, 30% at night (Instagram behaviour).

### 9.2 Distributions

| Dimension | Weights |
|---|---|
| Source | INSTAGRAM_PAID 70%, FACEBOOK 8%, INSTAGRAM_ORGANIC 4%, WEBSITE 6%, WHATSAPP 4%, GOOGLE 3%, REFERENCE 3%, WALK_IN 1%, CALL 1% |
| Location outcome | Worli 30%, Andheri 30%, Tardeo 10%, Pune 8%, Out-of-area 7%, Needs location 15% (needs-location mostly in the last 5 days; older ones got resolved and handed over) |
| Products | Kitchen 58%, Kitchen+Wardrobes 20%, Wardrobes 8%, Kitchen+Wardrobes+Furniture(+Beds) 8%, Appliances/Others 6% |
| Priority | HOT 15%, WARM 60%, COLD 25% |
| Architect linked | 15% of leads (Worli/Tardeo-heavy) |
| Returning customers | 4 leads |

### 9.3 Stage by age (makes the funnel believable)

| Lead age | Stage mix |
|---|---|
| 0–2 days | NEW 55%, CONTACTED 30%, QUALIFIED 15% |
| 3–14 days | CONTACTED 20%, QUALIFIED 30%, DISCOVERY_MEETING 15%, QUOTATION_REQUESTED 10%, LOST/NO_RESPONSE 20%, LOST/other 5% |
| 15–45 days | QUALIFIED 15% (long possession), DISCOVERY 10%, QUOTATION_SENT 18%, NEGOTIATION 8%, TOKEN_RECEIVED 4%, WON 5%, LOST 40% |
| 46–75 days | QUALIFIED 10% (nurture), QUOTATION_SENT 8%, NEGOTIATION 4%, WON 10%, LOST 68% |

Lost reason mix: NO_RESPONSE 55%, BUDGET 15%, COMPETITOR 13%, TIMELINE 8%, ON_HOLD 5%, OTHERS 4%. ON_HOLD/TIMELINE leads get a `reviveAt` between −3 and +40 days, so 1–2 revive reminders fire on reset.

Values: `estimatedValueInr` for DISCOVERY+ ≈ ₹4–35 L (log-normal-ish, rounded to ₹10,000). Won `orderValueInr` ≈ ₹8–35 L. One hero deal of ₹48 L.

### 9.4 Activity history per lead
- Always: SYSTEM "Lead received…", ROUTING, ASSIGNMENT (and HANDOVER if it came through the Online Desk).
- Per stage reached, add 1–3 realistic activities. Call outcomes: CONNECTED 45%, NO_ANSWER 35%, BUSY 8%, SWITCHED_OFF 4%, CALLBACK_REQUESTED 8%.
- NO_RESPONSE losses: 3–4 NO_ANSWER calls over ~10 days + one `close_the_loop` WhatsApp.
- DISCOVERY+ leads: one SHOWROOM_VISIT activity + one past Appointment (VISITED), at their branch.
- Notes use the snippets below, with variables filled in.

**Note snippets** (original wording in the style of the client's remarks):
1. "Spoke to client. {{bhk}} at {{area}}, possession in {{month}}. Wants a parallel kitchen with maximum storage."
2. "Prefers warm, neutral tones. No PU finish; open to veneer and glass."
3. "Will share the floor plan on WhatsApp today; wants a ballpark first."
4. "Visited {{branch}} experience centre with spouse. Liked ceramic shutters, worried about budget."
5. "Shared revised ballpark in two finishes (laminate / acrylic)."
6. "Did not answer. Will try again in the evening."
7. "Asked to call back after the festival week."
8. "Architect {{architect}} is involved; they will visit the showroom together next week."
9. "Wants turnkey including civil work; indicative budget ₹{{budget}} L."
10. "Possession delayed to {{month}} — follow up a month before."
11. "Comparing with two other vendors. Quotation sent, awaiting feedback."
12. "Wants appliances (hob + chimney) quoted along with the kitchen."
13. "Site is a bare-shell flat; plans to rent it out. Wants durable, low-maintenance finishes."
14. "Measurement visit done. Drawings to be shared by {{weekday}}."
15. "Negotiating on finish upgrade; token expected this week."
16. "Token received. Moving to production measurement."
17. "Client travelling, back on {{date}}."
18. "Only interested in wardrobes for now; kitchen next year."
19. "Requested a video call before visiting the showroom."
20. "Budget is lower than our range; shared a compact-kitchen option."

### 9.5 Synthetic pools
- **First names:** Rhea, Aditya, Kavya, Nikhil, Pooja, Aniket, Ruhi, Varun, Ritika, Kunal, Kriti, Rahul, Aisha, Pranav, Tanya, Vikram, Isha, Karan, Nandini, Sahil, Zoya, Manish, Priya, Sameer, Aditi, Yash, Simran, Abhay, Naina, Gaurav, Fatima, Akash, Mitali, Parth, Shreya, Imran, Radhika, Tejas, Meher, Arnav, Lavanya, Dhruv, Sanya, Jay, Tara, Neel, Ira, Kabir, Mahima, Ishaan.
- **Last names:** Kapoor, Shah, Mehta, Iyer, Nair, Desai, Patel, Joshi, Kulkarni, Rao, Sharma, Gupta, Malhotra, Menon, Pillai, Bhatt, Chopra, Fernandes, D'Souza, Shaikh, Khan, Jain, Agarwal, Banerjee, Sawant, Pawar, Gokhale, Thakkar, Vora, Sethi.
- **No real first names:** this pool deliberately avoids every first name that appears in the client's sheet, so random first+last pairing can never recreate a real customer. Keep it that way if you extend it.
- **Phones:** `+9190000` + 5 digits, sequential from `00001`. The pattern is obviously synthetic, and the simulator never sends real messages.
- **Emails:** `firstname.lastname{n}@example.com` (the reserved example domain). 20% of leads have no email.
- **Salutation:** Mr/Ms/Mrs from the name pool's gender guess, else blank.
- **Societies for addresses:** "Sea View Heights", "Palm Residency", "Orchid Towers", "Lakeview Enclave", "Harbour Crest", "Sunrise Park", "Green Acres", "Skyline Residency", "Riverdale Apartments", "Silver Oak CHS". Format: "Flat {{n}}, {{society}}, {{locality}}". 10% of addresses are deliberately misspelt using the list at the end of §10.4, and 5% are "NA".

### 9.6 Architects (synthetic partners)

| Firm (`Company.kind=ARCHITECT_FIRM`) | Architect (`Contact.kind=ARCHITECT`) | Default commission |
|---|---|---|
| Studio Kaavya | Kaavya Rao | 8% |
| Line & Light Design | Nikhil Batra | 7.5% |
| Form Atelier | Rhea D'Souza | 10% |
| Studio Nine Interiors | Pooja Menon | 8% |
| Arcade Design Co. | Imran Patel | 5% |
| Blank Canvas Studio | Mehul Shah | 6% |

### 9.7 Campaign attribution (for INSTAGRAM_PAID / FACEBOOK leads)
- Campaigns: "Elementra – Leads – Aug 2026", "Elementra – Leads – Sep 2026", "Elementra – Leads – Oct 2026" (by lead month).
- Ad sets: "Mumbai 30+ – Real estate & architects interests", "Mumbai 30+ – Lookalike 2%", "Pune 30+ – New home buyers".
- Ads: "Trust – Reel", "Kitchen walkthrough – Carousel", "Wardrobe finishes – Static", "Showroom tour – Reel".
- Form: "Lead form – Bespoke products V4".

### 9.8 Live-state guarantees after generation
- ≈10 overdue FOLLOW_UP tasks spread across reps (Arjun has the most, so the "overdue by rep" chart tells a story)
- ≈12 tasks due today; ≈25 upcoming in the next 7 days
- ≈6 SCHEDULED appointments in the next 3 days (one tomorrow 11:00 at Worli)
- ≈5 NEW leads past the first-contact SLA today
- ≈8 Needs-location, ≈6 Out-of-area (open in the queues)
- ≈9 won leads → Deals + Projects at varied execution stages (two handed over, warranty dates set)
- ≈25 OutboundMessages in the last week (mixed DELIVERED/READ)

---

## 10. Locality gazetteer (seed `Locality`)

Approximate centroids, accurate enough for branch routing in the demo. Aliases are lowercase. **Do not add the demo misspellings (borivalli, goregoan, kandiwali, ghatkoper) as aliases**, because scenario 2 must show the fuzzy matcher at work.

### 10.1 Mumbai, Thane, Navi Mumbai (in service area)

| Name | City | Pincode | Lat | Lng | Aliases | Routes to (distance) |
|---|---|---|---|---|---|---|
| Colaba | Mumbai | 400005 | 18.9067 | 72.8147 | cuffe parade | TAR 6.9 |
| Fort | Mumbai | 400001 | 18.9345 | 72.8356 | ballard estate, cst | TAR 4.4 |
| Churchgate | Mumbai | 400020 | 18.9322 | 72.8264 | marine lines, marine drive | TAR 4.3 |
| Walkeshwar | Mumbai | 400006 | 18.9467 | 72.7953 | teen batti, banganga | TAR 3.2 |
| Malabar Hill | Mumbai | 400006 | 18.9548 | 72.7985 | nepean sea road, napean sea road | TAR 2.3 |
| Peddar Road | Mumbai | 400026 | 18.9686 | 72.8081 | pedder road, cumballa hill, kemps corner | TAR 0.7 |
| Breach Candy | Mumbai | 400026 | 18.9720 | 72.8045 | warden road | TAR 1.2 |
| Tardeo | Mumbai | 400034 | 18.9690 | 72.8150 | haji ali | TAR 0.0 |
| Grant Road | Mumbai | 400007 | 18.9633 | 72.8159 | nana chowk | TAR 0.6 |
| Byculla | Mumbai | 400027 | 18.9767 | 72.8326 | byculla west, byculla east | TAR 2.0 |
| Mahalaxmi | Mumbai | 400011 | 18.9827 | 72.8240 | jacob circle | TAR 1.8 |
| Lower Parel | Mumbai | 400013 | 18.9953 | 72.8300 | kamala mills, phoenix mills | WOR 2.9 |
| Parel | Mumbai | 400012 | 19.0000 | 72.8400 | parel east | WOR 3.2 |
| Worli | Mumbai | 400018 | 19.0176 | 72.8162 | worli sea face, worli naka | WOR 0.0 |
| Prabhadevi | Mumbai | 400025 | 19.0166 | 72.8295 | century bazaar | WOR 1.4 |
| Dadar West | Mumbai | 400028 | 19.0213 | 72.8424 | shivaji park, dadar w | WOR 2.8 |
| Dadar East | Mumbai | 400014 | 19.0178 | 72.8478 | hindu colony, dadar e | WOR 3.3 |
| Matunga | Mumbai | 400019 | 19.0270 | 72.8570 | kings circle, king's circle | WOR 4.4 |
| Mahim | Mumbai | 400016 | 19.0410 | 72.8400 | | WOR 3.6 |
| Sion | Mumbai | 400022 | 19.0390 | 72.8619 | sion west, sion east | WOR 5.4 |
| Wadala | Mumbai | 400031 | 19.0219 | 72.8644 | wadala east, wadala west | WOR 5.1 |
| Chembur | Mumbai | 400071 | 19.0522 | 72.9005 | chembur east, chembur west | WOR 9.7 |
| Deonar | Mumbai | 400088 | 19.0500 | 72.9130 | chembur deonar | WOR 10.8 |
| Tilak Nagar | Mumbai | 400089 | 19.0660 | 72.8920 | | WOR 9.6 |
| Kurla | Mumbai | 400070 | 19.0726 | 72.8845 | kurla west, kurla east | AND 9.1 |
| Ghatkopar East | Mumbai | 400077 | 19.0790 | 72.9080 | ghatkopar e | AND 10.4 |
| Ghatkopar West | Mumbai | 400086 | 19.0880 | 72.9000 | ghatkopar w | AND 9.1 |
| Vikhroli | Mumbai | 400083 | 19.1110 | 72.9280 | vikhroli east, vikhroli west | AND 10.7 |
| Powai | Mumbai | 400076 | 19.1176 | 72.9060 | hiranandani gardens, hiranandani | AND 8.3 |
| Bhandup | Mumbai | 400078 | 19.1430 | 72.9370 | bhandup west, bhandup east | AND 11.3 |
| Mulund West | Mumbai | 400080 | 19.1726 | 72.9425 | mulund w | AND 12.5 |
| Mulund East | Mumbai | 400081 | 19.1700 | 72.9600 | mulund e | AND 14.2 |
| Bandra West | Mumbai | 400050 | 19.0596 | 72.8295 | bandra w, pali hill, carter road | WOR 4.9 |
| Bandra Kurla Complex | Mumbai | 400051 | 19.0660 | 72.8680 | bkc, bandra east | WOR 7.7 |
| Khar West | Mumbai | 400052 | 19.0700 | 72.8360 | khar w | WOR 6.2 |
| Santacruz West | Mumbai | 400054 | 19.0810 | 72.8380 | santacruz w | AND 6.2 |
| Santacruz East | Mumbai | 400055 | 19.0800 | 72.8540 | santacruz e, kalina | AND 6.8 |
| Vile Parle East | Mumbai | 400057 | 19.0990 | 72.8490 | vile parle, parle east | AND 4.6 |
| Juhu | Mumbai | 400049 | 19.1075 | 72.8263 | juhu tara road | AND 3.2 |
| JVPD | Mumbai | 400049 | 19.1070 | 72.8370 | jvpd scheme | AND 3.4 |
| Andheri West | Mumbai | 400053 | 19.1364 | 72.8296 | andheri w, lokhandwala, versova, four bungalows | AND 0.0 |
| Andheri East | Mumbai | 400069 | 19.1197 | 72.8468 | andheri e, marol, chakala | AND 2.6 |
| Jogeshwari West | Mumbai | 400102 | 19.1400 | 72.8480 | jogeshwari, oshiwara | AND 2.0 |
| Goregaon East | Mumbai | 400063 | 19.1650 | 72.8580 | goregaon e, oberoi mall, film city | AND 4.4 |
| Goregaon West | Mumbai | 400104 | 19.1640 | 72.8490 | goregaon w | AND 3.7 |
| Malad West | Mumbai | 400064 | 19.1870 | 72.8480 | malad w, malad | AND 5.9 |
| Malad East | Mumbai | 400097 | 19.1860 | 72.8600 | malad e | AND 6.4 |
| Kandivali West | Mumbai | 400067 | 19.2040 | 72.8520 | kandivali w | AND 7.9 |
| Kandivali East | Mumbai | 400101 | 19.2050 | 72.8700 | kandivali e, thakur village | AND 8.7 |
| Borivali West | Mumbai | 400092 | 19.2307 | 72.8567 | borivali w, borivali | AND 10.9 |
| Borivali East | Mumbai | 400066 | 19.2290 | 72.8650 | borivali e | AND 10.9 |
| Dahisar | Mumbai | 400068 | 19.2500 | 72.8590 | dahisar east, dahisar west | AND 13.0 |
| Mira Road | Mira-Bhayandar | 401107 | 19.2810 | 72.8710 | mira bhayandar | AND 16.7 |
| Thane West | Thane | 400601 | 19.2183 | 72.9781 | thane w, majiwada | AND 18.1 |
| Ghodbunder Road | Thane | 400615 | 19.2600 | 72.9700 | ghodbunder, gb road | AND 20.2 |
| Dombivli | Thane | 421201 | 19.2183 | 73.0867 | dombivli east, dombivli west | AND 28.5 (edge, inside) |
| Vashi | Navi Mumbai | 400703 | 19.0771 | 72.9986 | vashi sector | WOR by rule (AND 18.9) |
| Nerul | Navi Mumbai | 400706 | 19.0330 | 73.0180 | seawoods | WOR by rule |
| CBD Belapur | Navi Mumbai | 400614 | 19.0230 | 73.0400 | belapur | WOR by rule |
| Kharghar | Navi Mumbai | 410210 | 19.0470 | 73.0700 | | WOR by rule (26.9) |
| Airoli | Navi Mumbai | 400708 | 19.1590 | 72.9980 | | WOR by rule (AND 17.9) |
| Ghansoli | Navi Mumbai | 400701 | 19.1190 | 73.0010 | | WOR by rule (AND 18.1) |

### 10.2 Pune (in service area)

| Name | City | Pincode | Lat | Lng | Aliases | Routes to |
|---|---|---|---|---|---|---|
| Ganj Peth | Pune | 411042 | 18.5030 | 73.8670 | pune city, timber market | PUN 0.0 |
| Kothrud | Pune | 411038 | 18.5074 | 73.8077 | | PUN 6.3 |
| Baner | Pune | 411045 | 18.5590 | 73.7868 | baner road | PUN 10.5 |
| Aundh | Pune | 411007 | 18.5580 | 73.8075 | | PUN 8.8 |
| Wakad | Pune | 411057 | 18.5990 | 73.7620 | pune wakad | PUN 15.4 |
| Pimple Saudagar | Pune | 411027 | 18.5990 | 73.7980 | pimple saudagar pune | PUN 12.9 |
| Hinjewadi | Pune | 411057 | 18.5910 | 73.7389 | hinjawadi | PUN 16.7 |
| Koregaon Park | Pune | 411001 | 18.5362 | 73.8940 | pune camp | PUN 4.7 |
| Viman Nagar | Pune | 411014 | 18.5679 | 73.9143 | | PUN 8.8 |
| Kharadi | Pune | 411014 | 18.5510 | 73.9400 | | PUN 9.4 |
| Hadapsar | Pune | 411028 | 18.5089 | 73.9260 | magarpatta | PUN 6.3 |

**Pune ambiguity:** "Pune" with no locality → resolve to Ganj Peth (city centroid), confidence 0.7. See §10.3.

### 10.3 City-level fallbacks (used ONLY when no locality, alias or pincode matched)

City words are **not** aliases. As aliases they'd beat real localities in "longest match" (e.g., "Kharghar, Navi Mumbai" would match "navi mumbai" instead of "kharghar").

| Text contains | Fallback | Confidence | Note |
|---|---|---|---|
| pune | Ganj Peth (PUN) | 0.7 | "Pune — area not specified" |
| navi mumbai | Vashi (WOR by rule) | 0.7 | |
| thane | Thane West (AND) | 0.7 | |
| mumbai, bombay | — | — | Too broad to choose a branch → `NEEDS_LOCATION` with note "City only — ask for area" |

### 10.4 Known places outside the service area (so the system can say *how far*, not just "unknown")

| Name | City/State | Pincode | Lat | Lng | Nearest branch (distance) |
|---|---|---|---|---|---|
| Panvel | Raigad, MH | 410206 | 18.9894 | 73.1175 | WOR 31.8 (just outside) |
| Kalyan | Thane, MH | 421301 | 19.2437 | 73.1355 | AND 34.3 (just outside) |
| Virar | Palghar, MH | 401303 | 19.4559 | 72.8114 | AND 35.6 (just outside) |
| Alibaug | Raigad, MH | 402201 | 18.6414 | 72.8722 | TAR 36.9 |
| Lonavala | Pune, MH | 410401 | 18.7546 | 73.4062 | PUN 56.0 |
| Nashik | Nashik, MH | 422001 | 19.9975 | 73.7898 | AND 138.9 |
| Ratnagiri | Ratnagiri, MH | 415612 | 16.9902 | 73.3120 | PUN 178.2 |
| Surat | Gujarat | 395001 | 21.1702 | 72.8311 | AND 226.1 |
| Hyderabad (Financial District) | Telangana | 500032 | 17.4150 | 78.3400 | PUN 488.3 |
| Raipur | Chhattisgarh | 492001 | 21.2514 | 81.6296 | PUN 867.2 |
| Ahmedabad | Gujarat | 380001 | 23.0225 | 72.5714 | — |
| Bengaluru | Karnataka | 560001 | 12.9716 | 77.5946 | — |
| Delhi | Delhi | 110001 | 28.6139 | 77.2090 | — |
| Goa (Panaji) | Goa | 403001 | 15.4909 | 73.8278 | — |
| Nagpur | Maharashtra | 440001 | 21.1458 | 79.0882 | — |
| Indore | Madhya Pradesh | 452001 | 22.7196 | 75.8577 | — |

**Region keyword fallback.** If nothing else matches but the text contains a state or region outside the service area (gujarat, karnataka, telangana, chhattisgarh, madhya pradesh / mp, delhi, goa, rajasthan, uttar pradesh / up, kerala, tamil nadu, west bengal, punjab, haryana, dubai, usa, uk), mark it `OUT_OF_AREA` with `geoMethod = ALIAS`, confidence 0.6, explanation "Mentions Gujarat — outside service area". Show no distance.

**Misspellings for generator realism** (inputs only, never aliases): "Borivalli west", "Goregoan east", "Kandiwali east", "Ghatkoper west", "Andheri (W)", "Navi mumbai vashi", "Powai hiranandani", "Thane - Ghodbunder", "Malad mumbai".

---

## 11. Default settings (`AppSetting` seed)

```json
{
  "routing": {
    "mode": "DIRECT",
    "outOfAreaAction": "MANAGER_QUEUE",
    "productRuleEnabled": false
  },
  "geo": { "provider": "LOCAL", "fuzzyThreshold": 0.88 },
  "duplicates": { "policy": "LINK_SAME_OWNER", "windowDays": 180 },
  "workingHours": { "tz": "Asia/Kolkata", "days": [0,1,2,3,4,5,6], "open": "10:00", "close": "19:30" },
  "sla": { "firstContactMins": 60, "escalateMins": 240 },
  "reminders": {
    "staleDays": { "CONTACTED": 3, "QUALIFIED": 3, "DISCOVERY_MEETING": 4, "QUOTATION_REQUESTED": 2, "QUOTATION_SENT": 3, "NEGOTIATION": 2, "TOKEN_RECEIVED": 5 },
    "appointmentHours": 24,
    "noResponseCalls": 3,
    "digestTime": "09:30"
  },
  "messaging": { "autoWelcome": true, "defaultLanguage": "en", "provider": "SIMULATOR" },
  "notifications": { "ownerCopiesNewLeads": true }
}
```

---

## 12. Report layouts (rebuild the client's Executive Summary pivots)

| Report | Rows | Columns | Value | Client pivot it replaces |
|---|---|---|---|---|
| A. Leads by status & product | Stage (client labels) → Product | Month (Aug, Sep, Oct…) | Count | "Executive Summary" pivot 1 |
| B. Handover by branch | Branch (Worli, Andheri, Tardeo, Pune, Out of area, Needs location) | — | Count | "Executive Summary 2" |
| C. Order value by branch & rep | Branch | Rep | Sum of order value (₹) | "Executive Summary 3" |

Each report gets a date-range filter, a branch filter and CSV download.

---

## 13. Project (post-sale) stages — from the client's hidden "Current Live Projects" sheet

| Order | Enum | Label |
|---|---|---|
| 1 | `MEASUREMENT_REVERIFY` | Re-verify measurement |
| 2 | `CIVIL_WORK` | Civil work in progress |
| 3 | `PRODUCTION_MEASUREMENT` | Re-verify measurement for production |
| 4 | `ORDER_SENT_TO_FACTORY` | Order sent to factory |
| 5 | `MATERIAL_DELIVERED` | Material delivered |
| 6 | `INSTALLATION` | Installation in progress |
| 7 | `CLEANING` | Cleaning |
| 8 | `HANDOVER` | Handover |

Warranty end = handover date + **60 months** (their sheet uses `EDATE(handover, 60)`). Other project fields from their sheet: site designer, site supervisor, material expected date, expected handover date.
