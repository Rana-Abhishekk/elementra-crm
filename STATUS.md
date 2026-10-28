# Elementra CRM — Feature status

> Generated from `lib/features.ts` by `npm run status`. Do not edit by hand.

| Status | Count |
|---|---|
| Live | 33 |
| Simulator | 2 |
| Preview | 2 |
| In progress | 8 |
| Planned | 2 |

## Week 1 — Foundation

| ID | Feature | Status | Notes | How to demo | Known gaps |
|---|---|---|---|---|---|
| F1 | Login, roles, role-scoped data | Live | 5 roles: Owner, Admin, Sales manager, Online Desk, Sales rep. Each sees only their leads. | Use the quick-login chips on the login page. |  |
| F35 | Contacts, companies, deals wired to leads; architects as partners | Live | Every lead links to a customer contact. Architect firms show leads influenced and won value. Won leads create a deal. | Contacts → Architects filter; Companies → Architect firms. |  |
| F2 | Lead capture: manual form | Live | + New lead from the top bar. Routed and assigned on save. | Top bar → + New lead. |  |
| F14 | Leads list: filters, search, saved views, bulk reassign | Live | Views: My open, Due today, Overdue, Needs location, Out of area, Returning, All. Cards on phones. | Leads. |  |
| F15 | Lead detail: timeline, quick actions, stages, lost reasons | Live | Call / WhatsApp buttons, notes, call outcomes, stage changes, lost reasons with revive date, re-run routing. | Open any lead. |  |
| F16 | Pipeline kanban with your 14 stages | Live | Drag and drop; dropping on Lost asks for the reason. | Pipeline. |  |
| F20 | My Day: overdue / today / upcoming tasks | Live | Done, snooze, call and WhatsApp from one list. | Log in as Andheri rep → My Day. |  |
| F21 | Showroom appointments + reminders | Live | Book a visit, mark visited / no-show; reminder WhatsApp goes 24 h before. | Lead → Book showroom visit → Appointments. |  |

## Week 2 — The brain

| ID | Feature | Status | Notes | How to demo | Known gaps |
|---|---|---|---|---|---|
| F7 | Phone normalisation + duplicate / returning-customer detection | Live | Handles 91…, +91, spaces, two numbers in one cell, p: prefix. Repeat enquiries go to the same owner. | Demo panel → Returning customer. |  |
| F8 | Area check: pincode rules + locality map + spelling-tolerant matching | Live | ~90 Mumbai / Thane / Navi Mumbai / Pune localities. Understands "Borivalli", "Goregoan", "Kandiwali". | Map → Routing playground → "kandiwali east". |  |
| F9 | Area check: Google Maps geocoding | In progress | Provider coded and switched off. Turns on when your Google Cloud key is added. |  | Needs the client's Google Cloud API key. |
| F10 | Auto-routing to branch + "Why this branch" card | Live | Pincode rules win over distance; otherwise the nearest Experience Centre within its radius. | Demo panel → any scenario → open the lead. |  |
| F11 | Auto-assignment inside a branch (skips people on leave) | Live | Round-robin or fewest open leads per branch. People on leave are skipped and listed on the card. | Demo panel → Rep on leave. |  |
| F12 | Needs-location queue → automatic handover | Live | The Online Desk types the area; the lead is handed over to the right branch instantly. | Queues → Needs location. |  |
| F13 | Out-of-area queue: accept / regret / close | Live | Managers see the distance to the nearest branch and decide in one click. | Queues → Out of area. |  |
| F28 | Routing playground | Live | Type any address → see the branch and the next rep. Dry run, nothing saved. | Map → playground. |  |

## Week 3 — The pipes

| ID | Feature | Status | Notes | How to demo | Known gaps |
|---|---|---|---|---|---|
| F4 | Meta Lead Ads webhook (Instagram / Facebook) | Simulator | Verification handshake and lead receiving are built. Demo leads carry their data inside the payload. |  | Needs Meta Business access and app approval to receive real leads. |
| F22 | WhatsApp template messages (EN + HI) with delivery ticks | Simulator | Welcome, location request, appointment reminder, quotation follow-up, close-the-loop, out-of-area. |  | Messages are not sent to real phones until your WhatsApp Business number is approved by Meta. |
| F23 | Click-to-WhatsApp and click-to-call | Live | Opens WhatsApp / the dialer with the customer's number. Works today, no API needed. |  |  |
| F5 | Import of Meta lead CSV exports | Live | Preview → import → duplicate report. Strips Meta's l:/p: prefixes. | Imports → upload prisma/fixtures/meta-leads-sample.csv. |  |
| F3 | Website enquiry form | Live | Public, mobile-first form at /enquire, plus an API for your website. | Open /enquire. |  |
| F6 | Google Sheets live sync | In progress | "Simulate new sheet row" shows the flow. |  | Needs access to your Google Sheet. |
| F33 | Integrations page with honest statuses | Live | Meta, WhatsApp, Google Maps, Sheets, Website — what's ready and what we need from you. |  |  |

## Week 4 — The robot

| ID | Feature | Status | Notes | How to demo | Known gaps |
|---|---|---|---|---|---|
| F18 | Reminder engine: 9 automation rules | Live | SLA, escalation, follow-ups, stale stages, appointment reminders, visit outcome, no-response, revive, daily digest. Runs on the server. | Automations → Run now. | On the Vercel Hobby plan, the scheduled run is once a day; minute-level runs need Pro or an external scheduler. |
| F17 | Follow-up scheduling on every open lead | Live | Quick chips: Today 6 PM, Tomorrow, +3 days, Next week. |  |  |
| F19 | In-app notifications | Live | Bell with toasts; refreshes every 15 seconds. |  |  |
| F47 | Automations screen (rules as cards) | Live | On/off, thresholds, fired-today counts, last firings. |  |  |
| F25 | Owner dashboard | Live | KPIs, funnel, sources, branches, overdue by person. |  |  |
| F26 | Reports: your 3 Excel pivots, live + CSV export | Live | Status × product × month, handover by branch, order value by branch × rep. |  |  |
| F45 | Campaign performance (campaign → ad set → ad) | Live | Leads, qualified, visits, won and ₹ by campaign, ad set and ad. |  |  |
| F34 | Audit log | Live | Who changed what, when. |  |  |
| F31 | Settings: routing, working hours, SLAs, duplicates | Live | All defaults from the Rules Sheet are editable here. |  |  |
| F32 | Settings: message templates | Live | Edit bodies with a live preview. |  | Approval status is simulated until templates are submitted to Meta. |
| F29 | Team: branches, members, on-leave, load | Live | On-leave toggle feeds straight into assignment. |  |  |
| F38 | Manager daily digest | Live | In-app every morning. |  | Email delivery is in progress. |
| F27 | Map view (OpenStreetMap) | Preview | Branches, service radius and lead pins. |  | Google Maps switches on with your API key. |
| F24 | WhatsApp two-way team inbox | In progress | Conversation view with simulated customer replies. |  | Needs the WhatsApp Business API connection. |
| F46 | WhatsApp broadcasts to segments | In progress | Segment picker and audience preview; sending is disabled. |  |  |
| F39 | Lead scoring / auto-priority | In progress | Manual Hot / Warm / Cold works today. |  |  |
| F40 | Product-based assignment rule | In progress | Toggle visible in Settings, disabled. |  |  |
| F42 | Demo control panel | Live | Scenario buttons, run reminders, reset demo data. Demo mode only. |  |  |
| F43 | Build Status page | Live | This page. |  |  |

## Week 5 — Go-live

| ID | Feature | Status | Notes | How to demo | Known gaps |
|---|---|---|---|---|---|
| F41 | Import of your current Sales Pipeline sheet | In progress | Column mapping preview is ready; cleaning rules to agree. |  | Needs the Rules Sheet sign-off and your latest sheet. |

## Beyond the launch package

| ID | Feature | Status | Notes | How to demo | Known gaps |
|---|---|---|---|---|---|
| F30 | Leave planner / attendance | In progress · add-on | Calendar layout; on-leave toggle already works on the Team page. |  |  |
| F36 | Post-sale Projects tracker (8 site stages + 5-year warranty) | Preview · add-on | Your "Current Live Projects" sheet, prototyped. |  |  |
| F37 | Quotation builder | Planned · add-on | Line items, finishes, PDF. Concept screen. |  |  |
| F44 | Native apps, multiple WhatsApp numbers, billing/GST, AI calling | Planned · add-on | Possible next phases. |  |  |
