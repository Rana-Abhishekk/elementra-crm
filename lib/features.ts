// Single registry of feature status. Drives <FeatureBadge>, the Build Status page and STATUS.md.

export type FeatureStatus = "LIVE" | "SIMULATED" | "PREVIEW" | "IN_PROGRESS" | "PLANNED";

export type FeatureWeek = "W1" | "W2" | "W3" | "W4" | "W5" | "BEYOND";

export interface Feature {
  id: string;
  title: string;
  status: FeatureStatus;
  week: FeatureWeek;
  note: string;
  demo?: string;
  gaps?: string;
  isAddon?: boolean;
}

export const STATUS_META: Record<FeatureStatus, { label: string; badge: string; className: string; tooltip: string }> = {
  LIVE: {
    label: "Live",
    badge: "Live",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    tooltip: "Works end to end on the real database.",
  },
  SIMULATED: {
    label: "Simulator",
    badge: "Simulator",
    className: "bg-teal-50 text-teal-700 ring-teal-200",
    tooltip: "Full flow works; only the external call (Meta / WhatsApp / Google) is simulated until your accounts are connected.",
  },
  PREVIEW: {
    label: "Preview",
    badge: "Preview",
    className: "bg-violet-50 text-violet-700 ring-violet-200",
    tooltip: "Works, but simplified or read-mostly.",
  },
  IN_PROGRESS: {
    label: "In progress",
    badge: "In progress",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
    tooltip: "The screen exists with a realistic layout; partly functional or showing sample data.",
  },
  PLANNED: {
    label: "Planned",
    badge: "Planned",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
    tooltip: "Planned for a later phase.",
  },
};

export const WEEK_LABEL: Record<FeatureWeek, string> = {
  // The client's delivery timeline
  W1: "Week 1 — CRM Foundation",
  W2: "Week 2 — Lead Logic & Chatbot",
  W3: "Week 3 — Integrations",
  W4: "Week 4 — Automation & Testing",
  W5: "Week 5 — UAT, Training & Go-Live",
  BEYOND: "Beyond the launch package",
};

export const FEATURES: Feature[] = [
  { id: "F1", title: "Secure login + branch-based data visibility", status: "LIVE", week: "W1", note: "Each role sees Own / Branch / All. Worli's manager never sees Pune; executives see only their own leads; Super Admin sees everything. Out-of-scope lead links answer \"not found\". Role changes and deactivation apply on the next click.", demo: "Quick-login as Worli Manager, Regional Mgr (Vikram) and Andheri Exec and compare the Leads list." },
  { id: "F35", title: "Contacts, companies, deals wired to leads; architects as partners", status: "LIVE", week: "W1", note: "Every lead links to a customer contact. Architect firms show leads influenced and won value. Won leads create a deal.", demo: "Contacts → Architects filter; Companies → Architect firms." },
  { id: "F2", title: "Lead capture: manual form", status: "LIVE", week: "W1", note: "+ New lead from the top bar. Routed and assigned on save.", demo: "Top bar → + New lead." },
  { id: "F14", title: "Leads list: filters, search, saved views, bulk reassign", status: "LIVE", week: "W1", note: "Views: My open, Due today, Overdue, Needs location, Out of area, Returning, All. Cards on phones.", demo: "Leads." },
  { id: "F15", title: "Lead detail: timeline, quick actions, stages, lost reasons", status: "LIVE", week: "W1", note: "Call / WhatsApp buttons, notes, call outcomes, stage changes, lost reasons with revive date, re-run routing.", demo: "Open any lead." },
  { id: "F16", title: "Pipeline kanban with your 14 stages", status: "LIVE", week: "W1", note: "Columns come from Masters → Pipelines & Statuses. Pipeline switcher; drag and drop; Won / Lost open a stage picker.", demo: "Pipeline." },
  { id: "F20", title: "My Day: overdue / today / upcoming tasks", status: "LIVE", week: "W1", note: "Done, snooze, call and WhatsApp from one list.", demo: "Log in as Andheri rep → My Day." },
  { id: "F21", title: "Showroom appointments + reminders", status: "LIVE", week: "W1", note: "Book a visit, mark visited / no-show; reminder WhatsApp goes 24 h before.", demo: "Lead → Book showroom visit → Appointments." },
  { id: "F7", title: "Phone number as the customer key (no duplicate entries)", status: "LIVE", week: "W1", note: "Normalised phone (+91…) is unique per customer, and the database allows only one open lead per number. Repeat enquiries are added to the open lead; the New lead form sends you to it. A closed customer coming back gets a new lead marked Returning.", demo: "Demo panel → Returning customer; or + New lead with an existing number." },
  { id: "F8", title: "Area check: pincode rules + locality map + spelling-tolerant matching", status: "LIVE", week: "W2", note: "~90 Mumbai / Thane / Navi Mumbai / Pune localities. Understands \"Borivalli\", \"Goregoan\", \"Kandiwali\".", demo: "Map → Routing playground → \"kandiwali east\"." },
  { id: "F9", title: "Area check: Google Maps geocoding", status: "IN_PROGRESS", week: "W2", note: "Provider coded and switched off. Turns on when your Google Cloud key is added.", gaps: "Needs the client's Google Cloud API key." },
  { id: "F10", title: "Auto-routing to branch + \"Why this branch\" card", status: "LIVE", week: "W2", note: "Pincode rules win over distance; otherwise the nearest Experience Centre within its radius.", demo: "Demo panel → any scenario → open the lead." },
  { id: "F11", title: "Auto-assignment inside a branch (skips people on leave)", status: "LIVE", week: "W2", note: "Round-robin or fewest open leads per branch. People on leave are skipped and listed on the card.", demo: "Demo panel → Rep on leave." },
  { id: "F12", title: "Needs-location queue → automatic handover", status: "LIVE", week: "W2", note: "The Online Desk types the area; the lead is handed over to the right branch instantly.", demo: "Queues → Needs location." },
  { id: "F13", title: "Out-of-area queue: accept / regret / close", status: "LIVE", week: "W2", note: "Managers see the distance to the nearest branch and decide in one click.", demo: "Queues → Out of area." },
  { id: "F28", title: "Routing playground", status: "LIVE", week: "W2", note: "Type any address → see the branch and the next rep. Dry run, nothing saved.", demo: "Map → playground." },
  { id: "F4", title: "Meta Lead Ads webhook (Instagram / Facebook)", status: "SIMULATED", week: "W3", note: "Verification handshake and lead receiving are built. Demo leads carry their data inside the payload.", gaps: "Needs Meta Business access and app approval to receive real leads." },
  { id: "F22", title: "WhatsApp template messages (EN + HI) with delivery ticks", status: "SIMULATED", week: "W3", note: "Welcome, location request, appointment reminder, quotation follow-up, close-the-loop, out-of-area.", gaps: "Messages are not sent to real phones until your WhatsApp Business number is approved by Meta." },
  { id: "F23", title: "Click-to-WhatsApp and click-to-call", status: "LIVE", week: "W3", note: "Opens WhatsApp / the dialer with the customer's number. Works today, no API needed." },
  { id: "F5", title: "Import of Meta lead CSV exports", status: "LIVE", week: "W3", note: "Preview → import → duplicate report. Strips Meta's l:/p: prefixes.", demo: "Imports → upload prisma/fixtures/meta-leads-sample.csv." },
  { id: "F3", title: "Website enquiry form", status: "LIVE", week: "W3", note: "Public, mobile-first form at /enquire, plus an API for your website.", demo: "Open /enquire." },
  { id: "F6", title: "Google Sheets live sync", status: "IN_PROGRESS", week: "W3", note: "\"Simulate new sheet row\" shows the flow.", gaps: "Needs access to your Google Sheet." },
  { id: "F33", title: "Integrations page with honest statuses", status: "LIVE", week: "W3", note: "Meta, WhatsApp, Google Maps, Sheets, Website — what's ready and what we need from you." },
  { id: "F18", title: "Reminder engine: 9 automation rules", status: "LIVE", week: "W4", note: "SLA, escalation, follow-ups, stale stages, appointment reminders, visit outcome, no-response, revive, daily digest. Runs on the server.", demo: "Automations → Run now.", gaps: "On the Vercel Hobby plan, the scheduled run is once a day; minute-level runs need Pro or an external scheduler." },
  { id: "F17", title: "Follow-up scheduling on every open lead", status: "LIVE", week: "W4", note: "Quick chips: Today 6 PM, Tomorrow, +3 days, Next week." },
  { id: "F19", title: "In-app notifications", status: "LIVE", week: "W4", note: "Bell with toasts; refreshes every 15 seconds." },
  { id: "F47", title: "Automations screen (rules as cards)", status: "LIVE", week: "W4", note: "On/off, thresholds, fired-today counts, last firings." },
  { id: "F25", title: "Owner dashboard", status: "LIVE", week: "W4", note: "KPIs, funnel, sources, branches, overdue by person." },
  { id: "F26", title: "Reports: your 3 Excel pivots, live + CSV export", status: "LIVE", week: "W4", note: "Status × product × month, handover by branch, order value by branch × rep." },
  { id: "F45", title: "Campaign performance (campaign → ad set → ad)", status: "LIVE", week: "W4", note: "Leads, qualified, visits, won and ₹ by campaign, ad set and ad." },
  { id: "F34", title: "Audit log", status: "LIVE", week: "W4", note: "Who changed what, when." },
  { id: "F31", title: "Settings: routing, working hours, SLAs, duplicates", status: "LIVE", week: "W4", note: "All defaults from the Rules Sheet are editable here." },
  { id: "F32", title: "Settings: message templates", status: "LIVE", week: "W4", note: "Edit bodies with a live preview.", gaps: "Approval status is simulated until templates are submitted to Meta." },
  { id: "F29", title: "Team: branches, members, on-leave, load", status: "LIVE", week: "W4", note: "On-leave toggle feeds straight into assignment." },
  { id: "F38", title: "Manager daily digest", status: "LIVE", week: "W4", note: "In-app every morning.", gaps: "Email delivery is in progress." },
  { id: "F27", title: "Map view (OpenStreetMap)", status: "PREVIEW", week: "W4", note: "Branches, service radius and lead pins.", gaps: "Google Maps switches on with your API key." },
  { id: "F24", title: "WhatsApp two-way team inbox", status: "IN_PROGRESS", week: "W4", note: "Conversation view with simulated customer replies.", gaps: "Needs the WhatsApp Business API connection." },
  { id: "F46", title: "WhatsApp broadcasts to segments", status: "IN_PROGRESS", week: "W4", note: "Segment picker and audience preview; sending is disabled." },
  { id: "F39", title: "Lead qualification score, auto-priority and qualification gate", status: "IN_PROGRESS", week: "W2", note: "Manual Hot / Warm / Cold works today. Stages already carry the \"needs qualification\" flag; scoring and the gate are Week 2." },
  { id: "F40", title: "Product-based assignment rule", status: "IN_PROGRESS", week: "W4", note: "Toggle visible in Settings, disabled." },
  { id: "F42", title: "Demo control panel", status: "LIVE", week: "W4", note: "Scenario buttons, run reminders, reset demo data. Demo mode only." },
  { id: "F43", title: "Build Status page", status: "LIVE", week: "W4", note: "This page." },
  { id: "F41", title: "Import of your current Sales Pipeline sheet", status: "IN_PROGRESS", week: "W5", note: "Column mapping preview is ready; cleaning rules to agree.", gaps: "Needs the Rules Sheet sign-off and your latest sheet." },
  { id: "F30", title: "Leave planner / attendance", status: "IN_PROGRESS", week: "BEYOND", note: "Calendar layout; on-leave toggle already works on the Team page.", isAddon: true },
  { id: "F36", title: "Post-sale Projects tracker (8 site stages + 5-year warranty)", status: "PREVIEW", week: "BEYOND", note: "Your \"Current Live Projects\" sheet, prototyped.", isAddon: true },
  { id: "F37", title: "Quotation builder", status: "PLANNED", week: "BEYOND", note: "Line items, finishes, PDF. Concept screen.", isAddon: true },
  { id: "F44", title: "Native apps, multiple WhatsApp numbers, billing/GST, AI calling", status: "PLANNED", week: "BEYOND", note: "Possible next phases.", isAddon: true },
  // ---- Week 1 foundation additions (client meeting, 28 Oct): masters, users & roles ----
  { id: "F48", title: "Masters: Pipelines & Statuses", status: "LIVE", week: "W1", note: "Admin renames headings, reorders, adds stages (columns), sets colours, Won / Lost, revive date, stale-day nudges. Several pipelines; Turnkey / Full Home is picked automatically by product. Stages holding leads are merged, never deleted.", demo: "Masters → Pipelines & Statuses → rename \"3. Lead Qualified\" → open Pipeline." },
  { id: "F49", title: "Masters: Sources", status: "LIVE", week: "W1", note: "Add sources (e.g. Housing.com), colours, paid flag, integration keys that map Meta / sheet / website values. Deactivate or merge; unmapped values land on \"Other\" with a warning.", demo: "Masters → Sources → Add source." },
  { id: "F50", title: "Masters: Products", status: "LIVE", week: "W1", note: "Add products for leads, order them, Meta answer keys. Used by forms, /enquire, filters, reports and pipeline auto-selection.", demo: "Masters → Products." },
  { id: "F51", title: "Masters: Branches", status: "LIVE", week: "W1", note: "Add / edit Experience Centres with a map pin, service radius, assignment style and pincode rules. Routing uses changes immediately.", demo: "Masters → Branches → Add branch (Thane) → Map → playground \"Thane West\"." },
  { id: "F52", title: "User management", status: "LIVE", week: "W1", note: "Create users with a role, home branch and extra branches, reports-to, temporary password (changed at first sign-in), deactivate with hand-over of open leads and tasks, last sign-in.", demo: "Masters → Users." },
  { id: "F53", title: "Roles & permissions", status: "LIVE", week: "W1", note: "Super Admin (locked), Branch Manager, Sales Executive, Online Desk, Management Viewer + your own roles: data scope + 29 permission checkboxes, clone, \"Preview as…\". Nobody can grant more than they have; the last Super Admin is protected.", demo: "Masters → Roles & permissions → Preview as… Vikram." },
  { id: "F54", title: "Team performance (Super Admin sees every manager)", status: "LIVE", week: "W1", note: "Per branch and person: open leads, new this week, first call within SLA, overdue follow-ups, visits, won, last sign-in, actions today.", demo: "Insights → Team performance." },
  { id: "F55", title: "Staging link for review", status: "IN_PROGRESS", week: "W1", note: "Deploy-ready for Vercel + Neon; steps in STAGING.md.", gaps: "Needs the Vercel and Neon accounts (or access) to publish the link." },
  { id: "F56", title: "Rule-based chatbot (website + WhatsApp)", status: "PLANNED", week: "W2", note: "Questions from the Online Desk script, creates and routes the lead. Week 2." },
  { id: "F57", title: "Masters: Areas & Pincodes, Other lists (budget, possession, property type, BHK)", status: "PLANNED", week: "W2", note: "Comes with qualification in Week 2. Routing already uses the ~90-locality map and branch pincode rules." },
];

export function feature(id: string): Feature {
  const f = FEATURES.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown feature ${id}`);
  return f;
}

export function featuresByWeek() {
  const weeks = Object.keys(WEEK_LABEL) as FeatureWeek[];
  return weeks.map((week) => ({ week, label: WEEK_LABEL[week], items: FEATURES.filter((f) => f.week === week) }));
}
