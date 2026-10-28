# Elementra CRM — Product & Demo Build Spec

> **Milestone:** First client demo ("work in progress" showcase)
> **Repo:** `elementra-crm` (existing Next.js app, same stack as PI-Education)
> **Read with:** `02_REFERENCE_DATA.md` (all seed data, enums, templates, scenarios)
> **Audience:** Claude Code (builder) and the dev lead (Rana)

---

## 0. How to use this document

This is the single source of truth for the demo build. It says **what** to build, **how far** to take each feature, and **how** it fits the existing codebase.

- Build in the phase order in §18. Each phase ends in a working, committed app.
- When this doc and the existing code disagree on conventions (file layout, component library, naming), **follow the existing code** and note the deviation in `project_docs/IMPLEMENTATION_PLAN.md`.
- When this doc is silent, pick the simplest option that looks good in a demo and log it in `IMPLEMENTATION_PLAN.md` under "Decisions".
- Never over-engineer. This is a demo milestone on a real codebase. It is not the final product.

---

## 1. Goal of this milestone

Show the client (Elementra) a **live, clickable CRM** that proves three things:

1. **The brain works.** A lead arrives from any source, the system reads its location, decides the right branch team, assigns a person, and explains why. Out-of-area and no-location leads are caught.
2. **Leads stop leaking.** Every lead has an owner and a next step. The reminder engine runs on the server and nags the right person, then escalates.
3. **Breadth is real and progressing.** Every module from the proposal has a screen. Screens that are not finished are visibly labelled ("Simulated", "Preview", "In progress"), so the demo is honest and still impressive.

**Success criteria for the demo:**
- The 15-minute demo script in §19 runs end to end without errors on a fresh `db:reset` + seed.
- The dashboard looks alive: about 180 synthetic leads, with dates relative to "today".
- It works on a phone browser (the client will ask).
- `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass.

---

## 2. The client in one paragraph

Elementra sells premium **modular kitchens, wardrobes, furniture, beds and appliances**. It has **Experience Centres** (showrooms) in **Worli, Andheri, Tardeo (Mumbai) and Pune**. Most enquiries come from **Instagram/Facebook paid lead ads**, plus WhatsApp, Google, walk-ins, calls, architect referrals and repeat customers. Today a central **Online Desk** (pre-sales) works every lead in one Google Sheet. They call the customer, find out where the site is, and hand the lead to the nearest Experience Centre. The branch team then books a showroom visit, sends a quotation, negotiates and closes. Notes live in one free-text "Remarks" cell. Follow-ups depend on memory, and 34% of tracked leads end as "Closed Lost – No response". Sales cycles are long because customers wait for flat possession. Architects often influence the deal and earn commission. After a sale, a project goes through measurement, factory order, delivery, installation and handover, with a 5-year warranty.

Full business context is in `04_UNDERSTANDING_THE_PROJECT.md`.

---

## 3. Scope tiers & feature status labels

Every feature has one status. Status shows in the UI through a shared `<FeatureBadge status=… />` component, and on the **Build Status** page.

| Status | Meaning in the demo | Badge text | Badge colour |
|---|---|---|---|
| `LIVE` | Works end to end on the real database | (no badge, or a small "Live" chip on the Build Status page only) | green |
| `SIMULATED` | Full flow works; only the external call (Meta/WhatsApp/Google) is replaced by a simulator. Switches on with the client's accounts. | "Simulator" | teal |
| `PREVIEW` | Works, but simplified or read-mostly | "Preview" | violet |
| `IN_PROGRESS` | The screen exists with a realistic layout; partly functional or showing sample data | "In progress" | amber |
| `PLANNED` | Listed on the Build Status page; at most a static "concept" screen | "Planned" / "Add-on" | grey |

> **Scope rule:** some items below go beyond the proposal's ₹1,49,000 launch package (post-sale Projects, Quotation builder). Show them as **add-ons** (`isAddon: true` in the registry) so the client sees ambition without assuming they're included. The Build Status page groups add-ons under "Beyond the launch package".

### Feature list (target status at demo time)

| # | Feature | Target |
|---|---|---|
| F1 | Login, roles, role-scoped data | LIVE |
| F2 | Lead capture: manual form | LIVE |
| F3 | Lead capture: public website enquiry form `/enquire` | LIVE |
| F4 | Lead capture: Meta Lead Ads webhook (`/api/webhooks/meta/leadgen`, verify handshake + receive) | SIMULATED |
| F5 | Lead capture: CSV import of a Meta Leads export (preview → import → dedupe report) | LIVE |
| F6 | Lead capture: Google Sheets live sync | IN_PROGRESS (status card + "Import row" simulator) |
| F7 | Phone normalisation + duplicate / returning-customer detection | LIVE |
| F8 | Area check: pincode rules + local locality map + spelling-tolerant matching | LIVE |
| F9 | Area check: Google Maps Geocoding provider | IN_PROGRESS (provider stub behind an env flag) |
| F10 | Auto-routing to branch + explainable "Why this branch" card | LIVE |
| F11 | Auto-assignment inside a branch (round-robin / least open leads; skips people on leave) | LIVE |
| F12 | Needs-location queue (Online Desk) → capture location → automatic handover | LIVE |
| F13 | Out-of-area queue (managers): accept / assign / send regret / close | LIVE |
| F14 | Leads list: filters, search, saved views, bulk reassign | LIVE |
| F15 | Lead detail: timeline, quick actions, stage changes, lost reasons | LIVE |
| F16 | Pipeline kanban with the client's 14 stages (drag and drop) | LIVE |
| F17 | Follow-up scheduling (next follow-up date on every open lead) | LIVE |
| F18 | Reminder engine (SLA, due follow-ups, stale stages, appointments, revive, escalation) | LIVE |
| F19 | In-app notifications (bell + toasts, polling) | LIVE |
| F20 | "My Day": overdue / today / upcoming tasks | LIVE |
| F21 | Showroom appointments + reminders | LIVE |
| F22 | WhatsApp: template messages (EN + HI) sent through a simulator outbox with delivery ticks | SIMULATED |
| F23 | WhatsApp: click-to-chat (`wa.me`) and click-to-call (`tel:`) links | LIVE |
| F24 | WhatsApp two-way team inbox | IN_PROGRESS (conversation view with simulated replies) |
| F25 | Owner dashboard (KPIs, funnel, sources, branches, overdue by rep) | LIVE |
| F26 | Reports: the client's 3 Excel pivots rebuilt live + CSV export | LIVE |
| F27 | Map view: branches, service radius, lead pins (OpenStreetMap) | PREVIEW |
| F28 | Routing playground ("type an address → see branch + rep") | LIVE |
| F29 | Team (EMS bits): branches, members, roles, on-leave toggle, load and performance | LIVE |
| F30 | Leave planner / attendance | IN_PROGRESS |
| F31 | Settings: routing rules, working hours, SLAs, duplicate policy | LIVE |
| F32 | Settings: message templates (view/edit, approval status) | LIVE (approval status simulated) |
| F33 | Integrations page (status cards for Meta, WhatsApp, Google Maps, Sheets, Website) | LIVE page, statuses honest |
| F34 | Audit log (who changed what) | LIVE |
| F35 | Contacts / Companies / Deals (existing modules) wired to leads; architects as partner contacts | LIVE |
| F36 | Post-sale Projects tracker (8 execution stages, warranty date) | PREVIEW · **add-on** |
| F37 | Quotation builder | PLANNED · **add-on** (concept screen) |
| F38 | Manager daily digest (in-app now; email later) | LIVE (in-app) / IN_PROGRESS (email) |
| F39 | Lead scoring / auto-priority | IN_PROGRESS (manual priority works) |
| F40 | Product-based assignment rule | IN_PROGRESS (toggle visible, disabled) |
| F41 | Legacy Excel import (their current Sales Pipeline sheet) | IN_PROGRESS (column-mapping preview) |
| F42 | Demo control panel (simulate scenarios, run reminders, reset) | LIVE (demo mode only) |
| F43 | Build Status page (this table, inside the app) | LIVE |
| F44 | Native mobile apps, multiple WhatsApp numbers, billing/GST, AI calling | PLANNED · add-on |
| F45 | Campaigns: performance by Meta campaign / ad set / ad (leads, qualified, visits, won, ₹) | LIVE |
| F46 | Campaigns: WhatsApp broadcasts to segments | IN_PROGRESS |
| F47 | Automations screen: rules R1–R9 as cards with on/off, thresholds, last-run counts | LIVE |

Keep the feature registry in **one file** (`lib/features.ts`) so the Build Status page, the badges and `STATUS.md` all agree.

---

## 4. Tech stack (existing; do not change)

Same stack as PI-Education, already in the repo:

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Server Components for reads, **Server Actions** for mutations, **Route Handlers** (`app/api/**/route.ts`) for webhooks, public endpoints, cron, exports and polling. `proxy.ts` (Next 16's replacement for `middleware.ts`) protects routes. |
| UI | **React 19**, **Tailwind CSS 4** | Reuse the existing `components/` patterns. If the repo already uses shadcn/ui, keep using it; if not, build small local primitives. Don't add a second component library. |
| DB | **Prisma 6** + **PostgreSQL** | Local Docker Postgres for dev; **Neon** (Singapore) in production. |
| Auth | **NextAuth v4**, Credentials (email + password), **JWT sessions** | Extend the JWT/session with `role`, `branchId` and `userId`. |
| Hosting | **Vercel** (`sin1`) | `vercel.json` already exists. |
| Language | TypeScript (strict) | |

**Stay on Prisma 6 and Next.js 16; don't upgrade major versions.** Prisma 7 moves the datasource `url` out of `schema.prisma` into `prisma.config.ts` and changes client setup, which isn't worth the churn before a demo.

**Before writing code, read the repo's `CLAUDE.md` and `AGENTS.md`.** The Next.js 16 `AGENTS.md` asks agents to check the docs bundled in `node_modules/next/dist/docs/`. Do that for `proxy.ts`, async `params`/`searchParams`, caching and revalidation APIs, because v16 differs from older training data.

### Allowed additions (keep the list short)

| Package | Why |
|---|---|
| `zod` | Validation for server actions and route handlers (skip if already present) |
| `recharts` | Dashboard charts |
| `@dnd-kit/core` (+ `@dnd-kit/sortable` if needed) | Kanban drag and drop |
| `leaflet`, `react-leaflet`, `@types/leaflet` | Map preview with OpenStreetMap tiles, no API key |
| `papaparse` (+ types) | CSV import |
| `@date-fns/tz` + `date-fns` | IST working-hours maths (servers run in UTC) |
| `lucide-react` | Icons (skip if another icon set exists) |
| `sonner` | Toasts (skip if the repo already has toasts) |
| `vitest` | Unit tests for domain logic (skip if a test runner exists) |
| `tsx` | Run TS scripts (seed, local cron runner) if not present |
| `bcryptjs` | Already likely present for credentials |

**Do not add:** Redux or other global state libraries, tRPC, GraphQL, Kafka/Redis/queues, microservices, Docker for the app itself, a second ORM, Google Maps JS SDK (it's a stub this milestone), or any paid API.

---

## 5. Local setup & ports

The team runs other projects on **3000**, and a Postgres container is usually on **5432**. Use these instead:

| Service | Port | How |
|---|---|---|
| Next.js dev / start | **4610** | `"dev": "next dev -p 4610"`, `"start": "next start -p 4610"` |
| PostgreSQL (Docker) | **5610** on the host → 5432 in the container | `docker-compose.yml` |
| Prisma Studio | **5611** | `"db:studio": "prisma studio --port 5611"` |

**`docker-compose.yml`** (repo root, new):

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: elementra-crm-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: elementra
      POSTGRES_PASSWORD: elementra_dev
      POSTGRES_DB: elementra_crm
    ports:
      - "5610:5432"
    volumes:
      - elementra_crm_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U elementra -d elementra_crm"]
      interval: 5s
      timeout: 3s
      retries: 10
volumes:
  elementra_crm_pgdata:
```

**`.env.example`** (merge with existing keys; never commit real secrets):

```bash
# --- Core ---
DATABASE_URL="postgresql://elementra:elementra_dev@localhost:5610/elementra_crm?schema=public"
NEXTAUTH_URL="http://localhost:4610"
NEXTAUTH_SECRET="change-me-openssl-rand-base64-32"
SEED_ADMIN_EMAIL="admin@elementra.test"
SEED_ADMIN_PASSWORD="Admin@1234"
SEED_ADMIN_NAME="Elementra Admin"

# --- App ---
APP_BRAND_NAME="Elementra"
APP_TIMEZONE="Asia/Kolkata"
DEMO_MODE="true"                 # enables demo panel, quick-login chips, reset
CRON_SECRET="change-me"          # Vercel Cron sends: Authorization: Bearer $CRON_SECRET
PUBLIC_FORM_API_KEY="change-me"  # for external website forms posting to /api/public/leads

# --- Integrations (leave empty → simulator / local provider is used) ---
META_VERIFY_TOKEN="elementra-verify-dev"
META_APP_SECRET=""
META_PAGE_ACCESS_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_ACCESS_TOKEN=""
GOOGLE_MAPS_API_KEY=""
GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON=""
GOOGLE_SHEET_ID=""
```

**`package.json` scripts** (merge; keep existing names like `db:migrate` and `db:seed`):

```jsonc
{
  "dev": "next dev -p 4610",
  "start": "next start -p 4610",
  "db:up": "docker compose up -d db",
  "db:down": "docker compose stop db",
  "db:migrate": "prisma migrate dev",
  "db:seed": "prisma db seed",                       // base data: admin, branches, localities, users, templates, settings
  "db:seed:demo": "tsx prisma/seed-demo.ts",         // synthetic leads/activities/tasks (relative dates)
  "db:reset": "prisma migrate reset --force && npm run db:seed:demo", // reset runs db:seed automatically
  "db:studio": "prisma studio --port 5611",
  "cron:dev": "tsx scripts/cron-dev.ts",             // calls /api/cron/reminders every 60s locally
  "dev:all": "concurrently -k \"npm:dev\" \"npm:cron:dev\"",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```

> `concurrently` is optional. If you'd rather not add it, document "run `npm run cron:dev` in a second terminal".

---

## 6. Architecture

One Next.js app: a **modular monolith**. Keep business logic in **pure, testable functions** under `lib/domain/**`. Server Actions and Route Handlers stay thin: they authenticate, validate with zod, call the domain, then revalidate.

### 6.1 Folder layout (adapt to existing conventions)

```
app/
  (auth)/login/                      # existing — add demo quick-login chips when DEMO_MODE
  enquire/page.tsx                   # PUBLIC website enquiry form (branded)
  dashboard/
    page.tsx                         # Owner/manager overview (replace or extend existing Overview)
    leads/page.tsx                   # list + filters + saved views
    leads/new/page.tsx
    leads/[id]/page.tsx              # detail + timeline + routing card + quick actions
    pipeline/page.tsx                # kanban
    my-day/page.tsx                  # tasks: overdue / today / upcoming
    queues/page.tsx                  # tabs: Needs location | Out of area | Unassigned
    appointments/page.tsx
    map/page.tsx                     # map preview + routing playground
    inbox/page.tsx                   # WhatsApp outbox (simulator) + conversation preview
    reports/page.tsx                 # client's pivots, live + CSV export
    campaigns/page.tsx               # campaign performance (LIVE) + broadcasts tab (In progress)
    automations/page.tsx             # reminder/automation rules as cards (R1–R9)
    team/page.tsx                    # branches, members, on-leave, load (EMS bits)
    projects/page.tsx                # post-sale tracker (Preview)
    quotations/page.tsx              # placeholder (In progress)
    imports/page.tsx                 # CSV import wizard
    contacts/ companies/ deals/      # existing modules — wire to leads
    settings/page.tsx                # tabs: Routing, Working hours & SLA, Templates, Integrations, Duplicates
    audit/page.tsx
    build-status/page.tsx
    demo/page.tsx                    # demo control panel (DEMO_MODE only)
  api/
    cron/reminders/route.ts          # GET, Bearer CRON_SECRET → runReminderEngine()
    webhooks/meta/leadgen/route.ts   # GET verify handshake, POST leadgen events
    public/leads/route.ts            # POST from external website (x-api-key)
    notifications/route.ts           # GET unread (polled by the bell)
    leads/export/route.ts            # GET CSV (scoped to the user)
lib/
  db.ts                              # existing Prisma client singleton
  auth/ (existing) + guards.ts       # requireUser(), requireRole(), canSeeLead()
  auth/scope.ts                      # leadWhereForUser(user) → Prisma where
  features.ts                        # feature registry (§3)
  domain/
    phone.ts                         # normalisePhone(), splitPhones()
    money.ts                         # formatINR(), formatLakh() → "₹8.5 L", "₹1.2 Cr"
    time.ts                          # IST helpers, isWithinWorkingHours(), nextOpening(), addWorkingMinutes()
    stages.ts                        # stage order, labels (client's wording), allowed transitions, open/closed sets
    geo/
      haversine.ts
      jaroWinkler.ts                 # ~30 lines, no dependency
      normalise.ts                   # text cleanup: case, punctuation, "(w)"→"west", common misspellings
      resolve.ts                     # resolveLocation(input) → {locality, lat, lng, pincode, method, confidence}
      providers/local.ts             # gazetteer-based (LIVE)
      providers/google.ts            # stub: used only if GOOGLE_MAPS_API_KEY set (IN_PROGRESS)
    routing/
      decide.ts                      # PURE: decideBranch(location, branches, pincodeRules, settings)
      assign.ts                      # PURE: pickAssignee(branch, members, strategy, loads)
      explain.ts                     # human-readable explanation lines
    leads/
      ingest.ts                      # ORCHESTRATOR: ingestLead(input, channel) — the heart of the app
      refCode.ts                     # "EL-1042"
    reminders/
      rules.ts                       # PURE rule evaluators (given snapshot + now → intents)
      engine.ts                      # loads data, runs rules, writes tasks/notifications/messages idempotently
    messaging/
      render.ts                      # {{var}} rendering
      provider.ts                    # interface MessagingProvider
      simulator.ts                   # writes OutboundMessage, fakes SENT→DELIVERED→READ
      metaCloud.ts                   # stub, used only when WHATSAPP_* env present
    integrations/
      metaLead.ts                    # map Meta lead (webhook/Graph shape) → IngestInput
      metaCsv.ts                     # map Meta CSV export row → IngestInput (strips "l:", "p:" prefixes)
      sheets.ts                      # stub
    settings.ts                      # zod schema + defaults + get/set (AppSetting table)
    audit.ts                         # writeAudit()
  demo/
    prng.ts                          # deterministic PRNG (mulberry32) for repeatable seeds
    scenarios.ts                     # the 10 named demo scenarios (§15.2)
    generate.ts                      # synthetic history generator (used by seed-demo + reset)
prisma/
  schema.prisma                      # extend (see §7)
  seed.ts                            # existing admin seed + base data
  seed-demo.ts                       # synthetic data
scripts/
  cron-dev.ts                        # local reminder runner
components/
  feature-badge.tsx, kpi-tile.tsx, stage-badge.tsx, lead-table.tsx, lead-timeline.tsx,
  routing-card.tsx, kanban/*, notification-bell.tsx, map/* (client-only), charts/*
```

### 6.2 Patterns

- **Reads:** Server Components call `lib/data/*.ts` query functions that **always** apply `leadWhereForUser(user)`.
- **Writes:** Server Actions in `app/dashboard/**/actions.ts` (or wherever the repo already keeps them). Each one runs `requireUser()` → zod parse → domain call → `writeAudit()` → `revalidatePath(...)`. Return `{ ok: true } | { ok: false, error }` and never throw to the client.
- **Side effects after commit:** run the DB writes for an operation in `prisma.$transaction`. Message sending (simulator) and notifications go after the commit.
- **Time:** store everything as UTC (`DateTime` → `timestamptz`). Display and do working-hours maths in **Asia/Kolkata**. Never use the server's local time (Vercel runs in UTC).
- **Map:** Leaflet must only render on the client. Wrap it in a client component and load it with `next/dynamic` `{ ssr: false }` from inside a client component.
- **Polling:** the notification bell polls `/api/notifications` every 15 seconds and shows a toast for new items. No websockets this milestone.
- **Explainability:** every automatic decision (route, assign, reminder) writes a human-readable line to the lead timeline. That's the demo's "wow".

---

## 7. Data model (Prisma)

> **First inspect the existing `prisma/schema.prisma`.** It already has `User`, `Contact`, `Company` and `Deal` (and NextAuth tables if used). **Extend them; do not duplicate.** If a field below already exists under another name, reuse it. If the existing `User.role` is a string or another enum, migrate it to the `Role` enum below and map the existing admin to `ADMIN`. Name the first migration `crm_demo_foundation`.

```prisma
// ---------- Enums ----------
enum Role {
  OWNER
  ADMIN
  SALES_MANAGER
  PRESALES
  SALES_REP
}
enum BranchKind {
  EXPERIENCE_CENTRE
  ONLINE_DESK
}
enum AssignmentStrategy {
  ROUND_ROBIN
  LEAST_OPEN_LEADS
}

enum LeadStage {
  NEW                  // 1. New Lead / Inquiry
  CONTACTED            // 2. Contacted
  QUALIFIED            // 3. Lead Qualified
  DISCOVERY_MEETING    // 4. Discovery / Requirement Meeting
  QUOTATION_REQUESTED  // 5. Quotation Requested
  QUOTATION_SENT       // 6. Quotation Sent
  NEGOTIATION          // 7. Negotiations
  TOKEN_RECEIVED       // 8. Token Received
  CLOSED_WON           // 9. Closed Won
  CLOSED_LOST          // 10–14. Closed Lost – <reason>
}
enum LostReason {
  BUDGET
  COMPETITOR
  TIMELINE
  NO_RESPONSE
  ON_HOLD
  OTHERS
}

// Marketing source = the client's own dropdown values (+ WEBSITE)
enum LeadSource {
  INSTAGRAM_PAID
  INSTAGRAM_ORGANIC
  FACEBOOK
  GOOGLE
  WHATSAPP
  LINKEDIN
  REFERENCE
  REPEAT_PURCHASE
  WALK_IN
  CALL
  WEBSITE
}
// Technical intake channel = how the record entered the system
enum IntakeChannel {
  META_LEAD_AD
  WEBSITE_FORM
  WHATSAPP
  GOOGLE_SHEET
  CSV_IMPORT
  MANUAL
}

enum Product {
  KITCHEN
  WARDROBES
  FURNITURE
  APPLIANCES
  BEDS
  OTHERS
}
enum Priority {
  HOT
  WARM
  COLD
}
enum LocationStatus {
  RESOLVED
  NEEDS_LOCATION
  OUT_OF_AREA
}
enum GeoMethod {
  PINCODE
  ALIAS
  FUZZY
  GOOGLE
  MANUAL
  NONE
}
enum RoutingRule {
  PINCODE_RULE
  NEAREST_IN_RADIUS
  OUT_OF_AREA
  NEEDS_LOCATION
  VIA_PRESALES
  RETURNING_SAME_OWNER
  MANUAL
}

enum ActivityType {
  NOTE
  CALL
  WHATSAPP
  EMAIL
  MEETING
  SHOWROOM_VISIT
  STAGE_CHANGE
  ASSIGNMENT
  HANDOVER
  FOLLOW_UP_SET
  MESSAGE_SENT
  APPOINTMENT
  ROUTING
  SYSTEM
}
enum CallOutcome {
  CONNECTED
  NO_ANSWER
  BUSY
  SWITCHED_OFF
  WRONG_NUMBER
  CALLBACK_REQUESTED
}

enum TaskType {
  FIRST_CALL
  FOLLOW_UP
  CAPTURE_LOCATION
  APPOINTMENT_PREP
  VISIT_OUTCOME
  QUOTATION_FOLLOW_UP
  REVIVE
  ESCALATION
  OUT_OF_AREA_REVIEW
  OTHER
}
enum TaskStatus {
  OPEN
  DONE
  SNOOZED
  CANCELLED
}
enum AppointmentStatus {
  SCHEDULED
  VISITED
  NO_SHOW
  RESCHEDULED
  CANCELLED
}
enum TemplateCategory {
  UTILITY
  MARKETING
}
enum TemplateStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  REJECTED
}
enum MessageStatus {
  QUEUED
  SENT
  DELIVERED
  READ
  FAILED
}
enum ContactKind {
  CUSTOMER
  ARCHITECT
  OTHER
}
enum CompanyKind {
  ARCHITECT_FIRM
  BUILDER
  VENDOR
  OTHER
}
enum ProjectStage {
  MEASUREMENT_REVERIFY
  CIVIL_WORK
  PRODUCTION_MEASUREMENT
  ORDER_SENT_TO_FACTORY
  MATERIAL_DELIVERED
  INSTALLATION
  CLEANING
  HANDOVER
}

// ---------- Extensions to EXISTING models (add fields only) ----------
// model User {
//   role           Role      @default(SALES_REP)
//   phone          String?
//   branchId       String?
//   branch         Branch?   @relation(fields: [branchId], references: [id])
//   isActive       Boolean   @default(true)
//   receivesLeads  Boolean   @default(true)   // managers can opt out
//   onLeave        Boolean   @default(false)
//   onLeaveUntil   DateTime?
//   lastAssignedAt DateTime?                  // round-robin cursor
//   ownedLeads     Lead[]    @relation("LeadOwner")
//   ...
// }
// model Contact {
//   kind            ContactKind @default(CUSTOMER)
//   phoneE164       String?     @db.VarChar(16)
//   leads           Lead[]      @relation("LeadContact")     // enquiries by this customer
//   influencedLeads Lead[]      @relation("LeadArchitect")   // leads where this contact is the architect
//   @@index([phoneE164])
// }
// Two relations Lead→Contact exist, so BOTH must be named (Prisma requirement).
// model Company { kind CompanyKind @default(OTHER) }
// model Deal    { leadId String? @unique; lead Lead? @relation(fields:[leadId], references:[id]) }

// ---------- New models ----------
model Branch {
  id                 String             @id @default(cuid())
  code               String             @unique          // WOR, AND, TAR, PUN, ONL
  name               String                              // "Worli Experience Centre"
  kind               BranchKind         @default(EXPERIENCE_CENTRE)
  city               String
  area               String?                             // "Worli, Mumbai 400018"
  lat                Float?
  lng                Float?
  serviceRadiusKm    Float              @default(25)
  assignmentStrategy AssignmentStrategy @default(ROUND_ROBIN)
  isActive           Boolean            @default(true)
  users              User[]
  pincodeRules       BranchPincode[]
  leads              Lead[]
  appointments       Appointment[]
  createdAt          DateTime           @default(now())
}

model BranchPincode {           // explicit "this pincode belongs to this branch" — wins over distance
  id       String @id @default(cuid())
  pincode  String @unique
  branchId String
  branch   Branch @relation(fields: [branchId], references: [id], onDelete: Cascade)
}

model Locality {                // local gazetteer (replaced/augmented by Google later)
  id      String   @id @default(cuid())
  name    String                         // "Borivali West"
  city    String                         // "Mumbai"
  pincode String?
  lat     Float
  lng     Float
  aliases String[]                       // ["borivali w", "borivali"] — never the demo misspellings
  leads   Lead[]
  @@index([pincode])
}

model Lead {
  id                 String         @id @default(cuid())
  refCode            String         @unique                 // "EL-1042"
  contactId          String?
  contact            Contact?       @relation("LeadContact", fields: [contactId], references: [id])

  // snapshot of what was captured (the client's sheet columns)
  salutation         String?
  firstName          String
  lastName           String?
  phoneE164          String?        @db.VarChar(16)
  altPhoneE164       String?        @db.VarChar(16)
  email              String?

  // location
  siteAddressRaw     String?
  pincode            String?
  localityId         String?
  locality           Locality?      @relation(fields: [localityId], references: [id])
  city               String?
  lat                Float?
  lng                Float?
  geoMethod          GeoMethod      @default(NONE)
  geoConfidence      Float?
  locationStatus     LocationStatus @default(NEEDS_LOCATION)

  // routing & ownership
  branchId           String?
  branch             Branch?        @relation(fields: [branchId], references: [id])
  ownerId            String?
  owner              User?          @relation("LeadOwner", fields: [ownerId], references: [id])
  handedOverById     String?
  handedOverAt       DateTime?
  assignedAt         DateTime?

  // pipeline
  stage              LeadStage      @default(NEW)
  stageChangedAt     DateTime       @default(now())
  lostReason         LostReason?
  lostNote           String?
  reviveAt           DateTime?                               // for ON_HOLD / TIMELINE
  products           Product[]
  priority           Priority       @default(WARM)
  possessionDate     DateTime?
  budgetNote         String?
  estimatedValueInr  Int?
  orderValueInr      Int?
  architectId        String?                                 // Contact(kind=ARCHITECT)
  architect          Contact?       @relation("LeadArchitect", fields: [architectId], references: [id])
  architectCommissionPct Float?

  // source attribution
  source             LeadSource
  intakeChannel      IntakeChannel
  campaignName       String?
  adsetName          String?
  adName             String?
  formName           String?
  platform           String?                                 // "ig" | "fb"
  externalId         String?        @unique                  // Meta leadgen id
  rawPayload         Json?

  // follow-up signals
  nextFollowUpAt     DateTime?
  lastActivityAt     DateTime       @default(now())
  firstContactedAt   DateTime?

  // duplicates
  duplicateOfId      String?
  duplicateOf        Lead?          @relation("LeadDuplicate", fields: [duplicateOfId], references: [id])
  duplicates         Lead[]         @relation("LeadDuplicate")
  isReturning        Boolean        @default(false)

  activities         Activity[]
  tasks              Task[]
  appointments       Appointment[]
  routingDecisions   RoutingDecision[]
  messages           OutboundMessage[]
  project            Project?
  deal               Deal?

  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt

  @@index([ownerId, stage])
  @@index([branchId, stage])
  @@index([locationStatus])
  @@index([nextFollowUpAt])
  @@index([phoneE164])
  @@index([createdAt])
}

model RoutingDecision {
  id               String      @id @default(cuid())
  leadId           String
  lead             Lead        @relation(fields: [leadId], references: [id], onDelete: Cascade)
  inputText        String?
  geoMethod        GeoMethod
  geoConfidence    Float?
  matchedLabel     String?                    // "Borivali West, Mumbai 400092"
  rule             RoutingRule
  distanceKm       Float?
  candidates       Json                       // [{branchCode, distanceKm, inRadius}]
  chosenBranchId   String?
  chosenUserId     String?
  strategy         AssignmentStrategy?
  skipped          Json?                      // [{userId, name, reason:"on leave"}]
  explanation      String[]                   // human-readable lines for the "Why" card
  actorId          String?                    // null = system
  createdAt        DateTime    @default(now())
}

model Activity {
  id          String        @id @default(cuid())
  leadId      String
  lead        Lead          @relation(fields: [leadId], references: [id], onDelete: Cascade)
  type        ActivityType
  callOutcome CallOutcome?
  body        String?
  meta        Json?
  actorId     String?                         // null = system ("Elementra CRM")
  createdAt   DateTime      @default(now())
  @@index([leadId, createdAt])
}

model Task {
  id           String     @id @default(cuid())
  leadId       String?
  lead         Lead?      @relation(fields: [leadId], references: [id], onDelete: Cascade)
  assigneeId   String
  type         TaskType
  title        String
  dueAt        DateTime
  status       TaskStatus @default(OPEN)
  ruleCode     String?                        // "R1", "R3"… null = manual
  dedupeKey    String?    @unique             // idempotency for the reminder engine
  snoozedUntil DateTime?
  completedAt  DateTime?
  createdById  String?
  createdAt    DateTime   @default(now())
  @@index([assigneeId, status, dueAt])
}

model Appointment {
  id          String            @id @default(cuid())
  leadId      String
  lead        Lead              @relation(fields: [leadId], references: [id], onDelete: Cascade)
  branchId    String
  branch      Branch            @relation(fields: [branchId], references: [id])
  hostId      String?
  scheduledAt DateTime
  durationMin Int               @default(60)
  status      AppointmentStatus @default(SCHEDULED)
  notes       String?
  createdAt   DateTime          @default(now())
  @@index([scheduledAt])
}

model Notification {
  id        String    @id @default(cuid())
  userId    String
  type      String                            // "LEAD_ASSIGNED" | "SLA_BREACH" | "FOLLOW_UP_DUE" | ...
  title     String
  body      String?
  leadId    String?
  href      String?
  dedupeKey String?   @unique
  readAt    DateTime?
  createdAt DateTime  @default(now())
  @@index([userId, readAt, createdAt])
}

model MessageTemplate {
  id        String           @id @default(cuid())
  code      String                              // "welcome_enquiry"
  language  String                              // "en" | "hi"
  name      String
  category  TemplateCategory
  body      String                              // "Hi {{name}}, ..."
  variables String[]
  status    TemplateStatus   @default(DRAFT)
  updatedAt DateTime         @updatedAt
  @@unique([code, language])
}

model OutboundMessage {
  id                String        @id @default(cuid())
  leadId            String?
  lead              Lead?         @relation(fields: [leadId], references: [id], onDelete: SetNull)
  channel           String        @default("WHATSAPP")
  templateCode      String?
  language          String        @default("en")
  toPhone           String
  body              String
  status            MessageStatus @default(QUEUED)
  provider          String        @default("SIMULATOR")
  providerMessageId String?
  error             String?
  sentById          String?                     // null = automation
  dedupeKey         String?       @unique
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
}

model Project {                                  // post-sale (Preview)
  id                 String       @id @default(cuid())
  leadId             String       @unique
  lead               Lead         @relation(fields: [leadId], references: [id])
  branchId           String
  designerId         String?
  supervisorId       String?
  stage              ProjectStage @default(MEASUREMENT_REVERIFY)
  stageHistory       Json         @default("[]")   // [{stage, at, by}]
  expectedHandoverAt DateTime?
  handoverAt         DateTime?
  warrantyEndsAt     DateTime?                      // handoverAt + 60 months
  createdAt          DateTime     @default(now())
}

model AppSetting {
  key         String   @id
  value       Json
  updatedById String?
  updatedAt   DateTime @updatedAt
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  action     String                               // "lead.stage_changed"
  entityType String
  entityId   String
  summary    String                               // "Stage: Contacted → Lead Qualified"
  diff       Json?
  createdAt  DateTime @default(now())
  @@index([entityType, entityId])
  @@index([createdAt])
}

model ImportJob {
  id         String   @id @default(cuid())
  fileName   String
  kind       String                               // "META_CSV" | "LEGACY_SHEET"
  totalRows  Int
  created    Int
  duplicates Int
  failed     Int
  errors     Json?
  createdById String
  createdAt  DateTime @default(now())
}
```

**Money** is stored as whole rupees (`Int`). Show it with Indian grouping (`₹8,50,000`) or compact form (`₹8.5 L`, `₹1.2 Cr`).

**Lead ↔ Contact ↔ Deal:**
- On ingest, find or create a `Contact(kind=CUSTOMER)` by `phoneE164` and link it. One person can have several enquiries (returning customers).
- An architect is a `Contact(kind=ARCHITECT)` linked to a `Company(kind=ARCHITECT_FIRM)`. A lead points to an architect with an optional commission %.
- When a lead moves to `CLOSED_WON`, create a `Deal` (won, amount = `orderValueInr`) linked to the lead. Use the existing Deal fields as they are, and also create a `Project` (Preview).

---

## 8. Core flow: lead intake → routing → assignment

### 8.1 `ingestLead(input, channel)` (the heart; `lib/domain/leads/ingest.ts`)

Every entry point calls this one function: the manual form, `/enquire`, the Meta webhook, CSV import, demo scenarios and the Sheets simulator.

```
IngestInput {
  salutation?, firstName, lastName?, phone?, email?,
  siteAddress?, pincode?, city?,
  products?: Product[], source: LeadSource, channel: IntakeChannel,
  campaignName?, adsetName?, adName?, formName?, platform?, externalId?,
  architectName?, notes?, receivedAt?: Date, rawPayload?
}
```

Steps (in order):

1. **Validate & normalise.** zod schema; trim names; title-case; `normalisePhone()` → E.164 `+91XXXXXXXXXX` (see §8.6). Reject if both phone and email are missing.
2. **Idempotency.** If `externalId` already exists, return the existing lead (Meta retries webhooks).
3. **Duplicate check** by `phoneE164` against leads created in the last 180 days (settings: `duplicates.windowDays`):
   - If an **open** lead exists → apply `duplicates.policy`:
     - `LINK_SAME_OWNER` (default): create the new lead with `duplicateOfId` and `isReturning = true`, give it to the **same owner and branch**, and skip geo routing. Rule `RETURNING_SAME_OWNER`. Notify the owner: "Returning enquiry from Priya S. (EL-1012)".
     - `WARN_ONLY`: route normally but show a "Possible duplicate" banner.
   - If only **closed** leads exist → route normally, set `isReturning = true`, and show a "Returning customer" chip.
4. **Resolve location** with `resolveLocation({siteAddress, pincode, city})` (§8.2).
5. **Decide branch** with `decideBranch(...)` (§8.3). Mode `routing.mode`:
   - `DIRECT` (default): resolved and in area → branch.
   - `VIA_PRESALES`: everything goes to the Online Desk first. The branch is computed and stored as a **suggestion**, and handover happens when pre-sales clicks "Hand over" or moves the stage to Qualified.
6. **Pick assignee** with `pickAssignee(...)` (§8.4).
7. **Persist** in one transaction: Contact (find/create), Lead, RoutingDecision, Activities (`SYSTEM: Lead received from Instagram lead ad · campaign …`, `ROUTING: …`, `ASSIGNMENT: …`), the first Task (`FIRST_CALL` or `CAPTURE_LOCATION`) with `dueAt` from working hours (§8.5), and the AuditLog entry.
8. **After commit:** notify the assignee; if `messaging.autoWelcome` is true and a phone exists, send the `welcome_enquiry` template (simulator) in `messaging.defaultLanguage`. For out-of-area leads, follow `routing.outOfAreaAction` (§8.3).
9. Return `{ lead, decision }`. The UI and the demo panel show the decision.

### 8.2 Location resolution (`lib/domain/geo/resolve.ts`)

The input can be messy: "Flat 1203, Lodha, Borivalli (W)", "goregoan east near oberoi mall", "400703", "Pune - Pimple Saudagar", "NA".

Order of attempts (stop at the first hit):

1. **Pincode.** Regex `\b[1-9][0-9]{5}\b` on pincode + address. If a `BranchPincode` rule matches, remember it for routing. Look the pincode up in `Locality` for coordinates → method `PINCODE`, confidence 1.0.
2. **Alias / exact name.** Normalise the text (lowercase; strip punctuation; `(w)`/` w ` → `west`, `(e)`/` e ` → `east`; collapse spaces; drop noise words like flat/tower/wing/near/opp/building/road/mumbai/maharashtra/india). Then check whether any `Locality.name` or alias appears as a whole phrase. Prefer the **longest** match, so "Andheri East" beats "Andheri". Method `ALIAS`, confidence 0.95. City words (pune, thane, navi mumbai, mumbai) are **not** aliases. They are a last-resort fallback after fuzzy matching (`02_REFERENCE_DATA.md` §10.3), so "Kharghar, Navi Mumbai" resolves to Kharghar, not Vashi.
3. **Fuzzy.** Jaro-Winkler on 1–3-word n-grams of the cleaned text against every name and alias. The best score ≥ `geo.fuzzyThreshold` (default **0.88**) wins → method `FUZZY`, confidence = score. This catches "Borivalli" (0.98), "Goregoan" (0.98), "Kandiwali" (0.96) and "Ghatkoper" (0.96).
   - **Direction words are matched separately.** "andheri west" vs "andheri east" scores 0.97, so a pure fuzzy match on the full name would mix up sides. Fuzzy-match the **base name** (without east/west), then apply the typed direction exactly. With no direction typed, use the base locality entry (e.g., "Andheri" → Andheri West centroid, flagged `confidence ≤ 0.9`).
   - Ignore tokens shorter than 4 characters for fuzzy matching, so "sion", "juhu" and "khar" only match exactly or by alias.
   - Tie-break on equal scores: longer locality name, then a Mumbai locality over a Pune one.
4. **Google provider** (stub) — only if `GOOGLE_MAPS_API_KEY` is set **and** steps 1–3 failed. In this milestone the function exists, is unit-tested with a mocked fetch, and is disabled by default.
5. Otherwise → `NONE` → `NEEDS_LOCATION`.

Text like "NA", "-", "na", "n/a", "multiple projects" or empty counts as no location.

### 8.3 Branch decision (`lib/domain/routing/decide.ts`, pure)

Inputs: the resolved location, active EXPERIENCE_CENTRE branches (with lat, lng and radius), the `BranchPincode` rules, and settings.

1. No location → rule `NEEDS_LOCATION` → Online Desk branch, assignee from PRESALES users. Task `CAPTURE_LOCATION`.
2. Pincode rule hit → rule `PINCODE_RULE` → that branch (even if another branch is nearer). Check the rule against the **typed pincode first, then the matched locality's pincode**. That way "Kharghar sector 20" (no pincode typed) still hits the 410210 rule. Explanation: "Pincode 400703 is mapped to Worli by rule (Andheri is 1.4 km nearer by distance)."
3. Compute the haversine distance to each branch. Branches where `distance ≤ serviceRadiusKm` are candidates. The **nearest candidate** wins → `NEAREST_IN_RADIUS`. Explanation: "Borivali West is 10.9 km from Andheri (radius 30 km); next nearest Worli 24.1 km."
4. No candidate → `OUT_OF_AREA`. Explanation: "Panvel is 31.8 km from the nearest branch, Worli (radius 30 km)." Action per `routing.outOfAreaAction`:
   - `MANAGER_QUEUE` (default): no owner; appears in the **Out of area** queue for OWNER/ADMIN/SALES_MANAGER; creates `OUT_OF_AREA_REVIEW` tasks for the owner/admin.
   - `AUTO_REGRET`: send the `out_of_area_regret` template and close as Lost → Others with note "Out of service area".
   - `ASSIGN_LOW_PRIORITY`: assign to the nearest branch with priority COLD.

Return `{ rule, branchId|null, distanceKm, candidates[], explanation[] }`.

### 8.4 Assignee selection (`lib/domain/routing/assign.ts`, pure)

Eligible members are users in the branch with `isActive`, `receivesLeads`, and **not on leave** (`onLeave` and `onLeaveUntil` in the future, or `onLeave` with no end date). Record skipped users with reasons, because the "Why" card shows them.

- `ROUND_ROBIN` (default): pick the eligible member with the oldest `lastAssignedAt` (null first). Update `lastAssignedAt` in the same transaction.
- `LEAST_OPEN_LEADS`: pick the member with the fewest open leads (stage not closed); tie-break by oldest `lastAssignedAt`.
- If no eligible member → assign the **branch manager** (if any), else leave unassigned in the "Unassigned" queue and notify the owner.

### 8.5 Working hours (`lib/domain/time.ts`)

Settings `workingHours`: `{ tz: "Asia/Kolkata", days: [1,2,3,4,5,6,0], open: "10:00", close: "19:30" }`. All 7 days by default, because showrooms are open weekends; Sunday can be turned off.

- `FIRST_CALL.dueAt = addWorkingMinutes(receivedAt, sla.firstContactMins)` (default **60** working minutes).
- A lead received at 23:40 IST → due at 11:00 next morning. The welcome WhatsApp still goes immediately. Timeline: "Received after hours — first call due 11:00 AM tomorrow."
- SLA breach and escalation thresholds are counted in working minutes too.

### 8.6 Phone normalisation (`lib/domain/phone.ts`)

Formats seen in the client's sheet (shown here with **synthetic** digits; use these in tests): `9000012345`, `919000012345`, `+91 90000 12345`, `"9000012345,\n9000067890"`, `(+1)5550142233`, `p:+919000012345`.

- Split on `,`, `/`, newline or ` or `. The first number is primary, the second is `altPhone`.
- Strip the `p:` prefix and every non-digit except a leading `+`.
- 10 digits starting with 6–9 → `+91XXXXXXXXXX`. A 12-digit number starting with `91` → `+91…`. 11 digits starting with `0` → drop the 0.
- If it already has `+` and a non-91 country code → keep it as is (international lead) and flag `isInternational` in `meta`.
- Unit-test all of the above.

---

## 9. Follow-up & reminder engine

**Principle:** reminders run on the **server**, not in someone's browser. If the laptop is closed, the reminder still fires.

### 9.1 Triggers

`runReminderEngine({ now })` in `lib/domain/reminders/engine.ts` is called by:
1. `GET /api/cron/reminders`, which checks `Authorization: Bearer ${CRON_SECRET}`. **Vercel Hobby only allows once-a-day crons** (deploys fail otherwise), so add `{"path":"/api/cron/reminders","schedule":"0 4 * * *"}` (09:30 IST digest) to `vercel.json`. In production, Pro (`*/5 * * * *`) or an external scheduler handles minute-level runs. Write this in the README.
2. `scripts/cron-dev.ts` locally (`npm run cron:dev`): calls the endpoint every 60 seconds.
3. The **"Run reminders now"** button on the Demo panel and on the Automations page (server action).

The engine must be **idempotent**: running it twice in the same minute creates nothing new. Use `dedupeKey` on Task, Notification and OutboundMessage.

### 9.2 Rules (`lib/domain/reminders/rules.ts`, pure; configurable in Settings)

| Code | Name | Condition | Action | dedupeKey |
|---|---|---|---|---|
| R1 | First-contact SLA | Lead in `NEW`, no CALL/WHATSAPP activity, working minutes since `assignedAt` > `sla.firstContactMins` (60) | Notify the owner "SLA breached: EL-1042 not contacted in 1 h". Mark the FIRST_CALL task overdue (red). | `R1:{leadId}` |
| R1b | SLA escalation | Same, and more than `sla.escalateMins` (240) | `ESCALATION` task + notification to the **branch manager** | `R1b:{leadId}` |
| R2 | Follow-up due | `nextFollowUpAt ≤ now` and an open `FOLLOW_UP` task exists | Notify the owner when due | `R2:{taskId}` |
| R2b | Follow-up overdue escalation | FOLLOW_UP task overdue > 24 h | Added to the manager's daily digest (R9); "Overdue" badge | — |
| R3 | Stale stage | Open lead, `lastActivityAt` older than `reminders.staleDays[stage]` (CONTACTED 3, QUALIFIED 3, DISCOVERY_MEETING 4, QUOTATION_REQUESTED 2, QUOTATION_SENT 3, NEGOTIATION 2, TOKEN_RECEIVED 5), and no open task | Create a `FOLLOW_UP` task (or `QUOTATION_FOLLOW_UP` for QUOTATION_SENT): "No activity for 4 days in Quotation Sent" | `R3:{leadId}:{stage}:{yyyy-mm-dd}` |
| R4 | Appointment reminder | SCHEDULED appointment starting within `reminders.appointmentHours` (24) | Send the `appointment_reminder` template to the customer (simulator) + `APPOINTMENT_PREP` task for the host | `R4:{appointmentId}` |
| R5 | Visit outcome | SCHEDULED appointment and `scheduledAt + 2h < now` | `VISIT_OUTCOME` task for the host: "Did Mr. Shah visit? Mark visited / no-show" | `R5:{appointmentId}` |
| R6 | No-response suggestion | ≥ 3 CALL activities with NO_ANSWER/SWITCHED_OFF/BUSY in the last 10 days and no CONNECTED since | Notification: "3 unanswered calls — send the close-the-loop message or mark No response". **Never auto-close.** | `R6:{leadId}:{weekNo}` |
| R7 | Revive | Lead `CLOSED_LOST` with reason ON_HOLD/TIMELINE and `reviveAt ≤ now` | `REVIVE` task to the last owner + notification "Possession was due — time to re-engage" | `R7:{leadId}` |
| R8 | Needs-location ageing | `NEEDS_LOCATION` lead older than 24 h | Notify the Online Desk lead + owner | `R8:{leadId}` |
| R9 | Manager daily digest | Once a day after 09:30 IST | One notification per manager/owner: "Yesterday: 14 new, 2 out-of-area. Overdue: Arjun 5, Meera 2." (Email: In progress) | `R9:{userId}:{date}` |

The engine returns a summary `{ evaluatedLeads, tasksCreated, notificationsCreated, messagesSent, byRule }`. The Demo panel shows it as a toast.

### 9.3 Follow-up UX

- Every open lead shows **Next follow-up** on the detail page, with quick chips: `Today 6 PM`, `Tomorrow`, `+3 days`, `Next week`, `Pick date…`, and a free-text "what to do" note. Setting it creates/updates the single open `FOLLOW_UP` task and logs `FOLLOW_UP_SET`.
- When a user logs an activity and there is no follow-up set on an open lead, prompt: "Set the next follow-up?" (non-blocking).
- Moving to `CLOSED_LOST` with reason ON_HOLD or TIMELINE asks for **"Remind me on"** (`reviveAt`), defaulting to `possessionDate − 30 days` if known.
- Leads list badges: `Overdue` (red), `Due today` (amber), `No follow-up` (grey outline), `SLA breached` (red outline).

---

## 10. Messaging (WhatsApp) — simulator now, Meta Cloud API later

- `MessagingProvider` interface: `send({to, templateCode, language, variables, leadId}) → {providerMessageId, status}`.
- `SimulatorProvider` (default): renders the template, writes an `OutboundMessage` (status `SENT`), then fakes progress to `DELIVERED` (~3 s) and `READ` (~20 s) for the demo. Implement this by updating status the next time the inbox or outbox is fetched, based on elapsed time. No background workers.
- `MetaCloudProvider` (stub): used only when `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` exist. Implement the HTTP call shape (`POST https://graph.facebook.com/v{N}/{phone-number-id}/messages`, template message) behind a flag, untested live, clearly marked.
- Templates are seeded in English and Hindi (see `02_REFERENCE_DATA.md` §6). Rendering supports `{{name}}`, `{{product}}`, `{{branch}}`, `{{rep_name}}`, `{{date}}`, `{{time}}`, `{{host_name}}`, `{{map_link}}`, `{{location}}`.
- **Inbox page** (`/dashboard/inbox`): left list of conversations (one per lead with messages), right side chat bubbles with ticks (✓ sent, ✓✓ delivered, blue ✓✓ read). A "Simulator" badge sits at the top. A "Simulate customer reply" button (demo mode) adds an inbound bubble. Two-way inbox = `IN_PROGRESS`.
- Every lead with a phone shows **"WhatsApp"** (opens `https://wa.me/91XXXXXXXXXX?text=…` in a new tab; works today with no API) and **"Call"** (`tel:`) buttons. These are LIVE.

---

## 11. Integrations (entry points)

| Integration | Route / file | Demo behaviour | Real behaviour (later) |
|---|---|---|---|
| Website enquiry form | `app/enquire/page.tsx` (server action) + `POST /api/public/leads` (`x-api-key`) | LIVE. Branded public form: name, phone, email, site pincode, area/society, products (multi-select), possession timeline, message. Shows "Thank you — our {branch} team will call you" when routed. | Same; embed via iframe or post from their website |
| Meta Lead Ads | `GET/POST /api/webhooks/meta/leadgen` | GET: answers `hub.challenge` when `hub.verify_token === META_VERIFY_TOKEN` (LIVE, testable with curl). POST: if `META_APP_SECRET` is set, verify `X-Hub-Signature-256`. For each `leadgen` change, if the payload contains `simulated_lead` (from the demo panel), map it directly; else call `fetchMetaLead(leadgenId)` (stub that throws "Meta not connected" unless a token is set). Status: SIMULATED. | Meta app with lead permissions, page subscribed to `leadgen`, Graph fetch of `field_data` |
| Meta CSV export import | `/dashboard/imports` | LIVE: upload CSV → preview first 20 mapped rows → import → summary (created, duplicates, failed). Columns per `02_REFERENCE_DATA.md` §7. | Same (one-time backfills) |
| Google Sheets | `lib/domain/integrations/sheets.ts` | IN_PROGRESS: Integrations card "Awaiting access to your Google Sheet" + demo button "Simulate new sheet row" that ingests one row with channel `GOOGLE_SHEET`. | Service account + polling or Apps Script webhook |
| Google Maps Geocoding | `lib/domain/geo/providers/google.ts` | IN_PROGRESS: provider coded, off without key; Integrations card explains the free-tier note | Key restricted to Geocoding API, billed to the client's Google Cloud |
| WhatsApp Cloud API | `lib/domain/messaging/metaCloud.ts` | SIMULATED (see §10) | Verified business, approved templates |

**Integrations page** (`/dashboard/settings?tab=integrations`): one card per integration with a status pill (Connected / Simulator / Awaiting client access / Not started), what is ready on our side, what we need from the client, and a "Test" button where it makes sense (e.g., "Send test webhook").

---

## 12. Roles, permissions & data scoping

| Role | Sees leads | Can |
|---|---|---|
| OWNER | All | Everything, incl. settings, team, reports, audit, demo panel |
| ADMIN | All | Same as owner (technical admin) |
| SALES_MANAGER | Own branch + Out-of-area queue + own | Reassign within/between branches, edit branch members' on-leave, view reports for own branch |
| PRESALES (Online Desk) | Own + Needs-location queue + leads they handed over (read-only after handover) | Capture location, qualify, hand over, create leads |
| SALES_REP | Own only | Work own leads, create leads (auto-routed), set follow-ups, book appointments |

- `leadWhereForUser(user)` is the only way list and detail queries filter. Every server action re-checks `canSeeLead` / `canEditLead`.
- `proxy.ts`: protect `/dashboard/:path*`. Keep public `/login`, `/enquire`, `/api/auth/*`, `/api/webhooks/*`, `/api/public/*` and `/api/cron/*`; each of those checks its own secret.
- The sidebar hides items the role can't use (e.g., reps don't see Team settings or Audit).

---

## 13. Screens

General: sidebar navigation with icons and group headings (**Work**: My Day, Leads, Pipeline, Queues, Appointments, Inbox · **Insights**: Dashboard, Reports, Campaigns, Map · **Customers**: Contacts, Companies/Partners, Deals, Projects, Quotations · **Admin**: Team, Automations, Imports, Settings, Audit, Build Status, Demo). The modules named in the proposal's launch package (dashboard, leads, contacts, companies, deals, tasks, inbox, campaigns, automations, templates, reports, audit, settings) must each be reachable in one click. The top bar has global search (name / phone / EL-ref), the notification bell, "+ New lead" and the user menu with role and branch. A `FeatureBadge` sits next to any non-LIVE nav item.

1. **Login.** Existing page plus, when `DEMO_MODE`, a row of quick-login chips: Owner · Online Desk · Worli Manager · Andheri Rep · Pune Rep.
2. **Dashboard** (`/dashboard`; owner/manager; a rep sees "My numbers").
   - KPI tiles (period selector: Today / 7d / 30d / This month): New leads · Uncontacted > SLA · Overdue follow-ups · Out-of-area · Showroom visits booked · Pipeline value (open stages ₹) · Won value (₹) · Conversion %.
   - Charts: Funnel by stage · Leads by source (Instagram paid dominant) · Leads by branch (handover distribution) · Leads per day (30d) · Overdue follow-ups by rep (bar) · Median first-response time by branch.
   - Lists: "Needs attention now" (top 8 overdue/breached), recent activity feed.
3. **Leads list.** Table: Ref, Name, Phone (masked except last 4 for reps of other branches — skip if complex), Area, Branch, Owner, Stage badge, Products chips, Source icon, Next follow-up (relative, coloured), Age, Value. Filters: stage(s), branch, owner, source, product, location status, follow-up state (overdue/today/none), date range, returning. Saved views as tabs: **My open · Due today · Overdue · Needs location · Out of area · Returning · All**. Bulk select → Reassign / Set follow-up / Export. Mobile: the table collapses into cards.
4. **Lead detail.** Header: name, ref, stage dropdown, priority, owner (reassign), branch, Call / WhatsApp / Send template buttons. Left column: contact & site info (editable; changing the address offers **"Re-run routing"**), products, possession date, budget, values, architect, source attribution (campaign, adset, ad, form, platform). **Routing card** "Why this lead went to Andheri" with explanation lines, a small distance table and skipped reps. Centre: **timeline** (filterable: All / Calls / Messages / Notes / System) with composer tabs: Note · Log call (outcome chips) · Send WhatsApp template · Book showroom visit. Right column: Next follow-up widget, open tasks, appointments, related leads (duplicates/returning), Deal/Project links.
5. **Pipeline (kanban).** Columns = the 8 open stages, plus collapsed "Won" and "Lost" drop zones. Cards show name, area, products, value, owner avatar and a follow-up badge. Dropping on Lost opens the lost-reason modal (+ reviveAt for ON_HOLD/TIMELINE). Filters: branch, owner, product. The column header shows count and ₹ sum.
6. **My Day.** Sections: Overdue · Today · Upcoming (7d) · Snoozed. Task row: type icon, lead link, title, due time, quick actions (Done, Snooze 1h / Tomorrow, Open lead, Call, WhatsApp). The header counts streaks: "You cleared 12 follow-ups this week" (a light touch, no gamification system).
7. **Queues.** Tabs: **Needs location** (Online Desk: inline "Add pincode / area" field → on save it re-routes instantly and shows the toast "Handed over to Andheri → Arjun Nair"), **Out of area** (managers: distance to the nearest branch, actions Accept for branch… / Send regret / Close as Lost), **Unassigned**.
8. **Appointments.** List grouped by day (with a simple week view if time allows): customer, branch, host, status. Actions: mark Visited / No-show / Reschedule. The "Book visit" modal on a lead picks branch (default = lead's branch), date-time and host.
9. **Inbox.** See §10.
10. **Reports.** The client's own three Excel pivots, rebuilt live:
    (a) **Leads by Status × Product, by Month** (pivot table with month columns),
    (b) **Handover count by Branch**,
    (c) **Order value by Branch × Rep**.
    Plus: source × stage conversion, lost reasons breakdown, and a CSV export of the filtered leads. A caption reads: "These are the same views as your Executive Summary sheet — now always up to date."
11. **Map** (Preview). Leaflet + OSM tiles: branch markers, service-radius circles (one colour per branch), lead pins coloured by stage group (open/won/lost/out-of-area). Filters by branch and stage. The side panel holds the **Routing playground**: a text box ("type any address or pincode") → shows the matched locality, method + confidence, distances to every branch, the decision, and which rep would get it next (dry run, no writes). Banner: "Preview map on OpenStreetMap. Google Maps switches on when your API key is added."
12. **Team** (EMS bits). Branch cards (code, area, radius, strategy, members). Member table: name, role, branch, receives leads, **On leave toggle** (+ until date), open leads, overdue tasks, leads this month, won this month, median first response. Managers/owner can edit. A "Leave planner" tab = IN_PROGRESS placeholder.
13. **Contacts / Companies / Deals** (existing). Contacts gets a `kind` filter (Customers / Architects) and a "Leads" tab on contact detail. Companies gets a `kind` filter (Architect firms, Builders). Architects show "Leads influenced" and "Won value". Deals lists won deals linked to leads.
14. **Projects** (Preview). Table of projects (from won leads): customer, branch, designer, supervisor, current stage, expected handover. Detail: an 8-step horizontal stepper (the client's own stages) with "Advance stage" and dates; warranty end = handover + 5 years.
15. **Quotations** (Planned · add-on). A clean concept screen: "Quotation builder — product line items, finishes, PDF. Proposed next phase." Show a static mock layout so it looks intentional. No logic.
15a. **Campaigns.** Tab "Performance": a table by campaign → ad set → ad (expandable) with leads, % with location, qualified, showroom visits, won, won ₹, and cost-per-lead input (manual ₹ spend per campaign, optional). Tab "Broadcasts" (In progress): segment picker (e.g., "Qualified, possession in next 60 days, Worli") + template picker + "Preview audience (n)" — send is disabled with an explanation.
15b. **Automations.** One card per rule R1–R9 (§9.2): plain-English description ("If a new lead isn't called within 60 working minutes, alert the owner; after 4 hours, alert the branch manager"), enabled toggle, editable thresholds, "fired today" count, and the last 5 firings. "Run now" button at the top.
16. **Imports.** Upload → choose type (Meta Leads CSV · Legacy Sales Pipeline sheet [In progress]) → mapping preview → import → result card + link to `ImportJob` history.
17. **Settings.** Tabs:
    - **Routing**: mode (Direct / Via pre-sales), area method (Pincode rules + locality map [active] · Km radius [active] · Google Maps [awaiting key]), per-branch radius + strategy, pincode rules table (add/remove), out-of-area action, product-based rule toggle (disabled, In progress).
    - **Working hours & SLA**: days, open/close, first-contact SLA, escalation, stale-days per stage, appointment reminder hours. Links to the Automations page.
    - **Templates**: list by code/language with status pill; edit the body with a live preview using sample variables.
    - **Duplicates**: policy + window days.
    - **Integrations**: cards (§11).
18. **Audit log.** Filterable table (actor, action, entity, summary, time) with a link to the entity.
19. **Build Status.** Renders `lib/features.ts` grouped by the proposal's 5-week plan (Week 1 Foundation · Week 2 The brain · Week 3 The pipes · Week 4 The robot · Week 5 Go-live · Beyond launch), with status pills and a short note per feature. The grouping is listed in `03_CLIENT_PITCH_AND_DEMO_SCRIPT.md` → Status board. It looks good on a projector.
20. **Demo panel** (DEMO_MODE only). Scenario buttons (§15.2), "10 random leads", "Simulate customer WhatsApp reply", "Simulate Google Sheet row", "Run reminders now", **Reset demo data** (with confirm). It shows the last result (decision explanation) in a side card. It is reachable from a small floating "Demo" button in the bottom-right when DEMO_MODE is on.
21. **Public `/enquire` page.** Brand header, short form, mobile-first. On submit it shows a thank-you with the branch name, or "We'll call you to confirm your location" when the location is unresolved.

---

## 14. Metric definitions (keep consistent)

- **New leads** = leads with `createdAt` in the period.
- **Open** = stage in NEW…TOKEN_RECEIVED. **Won** = CLOSED_WON. **Lost** = CLOSED_LOST.
- **Conversion %** = won ÷ (won + lost) for leads created in the period. Show "n/a" if the denominator < 5.
- **First response time** = `firstContactedAt − createdAt`, in working minutes. `firstContactedAt` = the first CALL (any outcome) or manual WHATSAPP/MESSAGE_SENT by a human (not the auto-welcome).
- **Overdue follow-up** = open task of type FOLLOW_UP/FIRST_CALL/QUOTATION_FOLLOW_UP with `dueAt < now`.
- **Pipeline value** = sum of `estimatedValueInr ?? orderValueInr` for open leads at QUOTATION_SENT or later.
- **Handover** = the lead's current branch (EXPERIENCE_CENTRE), counted where `handedOverAt` or `assignedAt` is in the period.

---

## 15. Demo mode

### 15.1 Seed data

- `npm run db:seed` (base, idempotent upserts): admin from `SEED_ADMIN_*` (role ADMIN), branches + pincode rules, localities, demo users, templates (EN+HI), default settings.
- `npm run db:seed:demo` (synthetic, **deterministic** PRNG seed `20261028`): about **180 leads** spread over the **last 75 days relative to now**, with activities, tasks, appointments, messages, a few projects and deals. Distribution and note snippets are in `02_REFERENCE_DATA.md` §9. **All names, phones and emails are synthetic.** Never copy rows from the client's sheet. Phones use the `+91 90000 0XXXX` range so they are obviously fake.
- The generator must leave the demo "alive" at any time it's run: ~10 overdue follow-ups, ~12 due today, ~6 appointments in the next 3 days, ~8 leads in Needs location, ~6 in Out of area, ~5 SLA breaches today.

### 15.2 Scenario buttons (exact details in `02_REFERENCE_DATA.md` §8)

1. Instagram ad — Worli flat (pincode) → Worli
2. Misspelt suburb "Goregoan east" → fuzzy → Andheri
3. Navi Mumbai pincode rule (Vashi 400703) → Worli by rule (Andheri is nearer by distance)
4. Pune enquiry (Baner) → Pune
5. Out of area — Surat → Out-of-area queue
6. Borderline — Panvel (31.8 km) → Out-of-area queue, "just outside radius"
7. No location (typical Meta form) → Needs-location queue (Online Desk)
8. Returning customer (phone matches an open lead) → same owner
9. Night lead (23:40 IST) → assigned, welcome sent, first call due 11:00 next morning
10. Rep on leave → turns on leave for one Andheri rep, then routes an Andheri lead → skips them

Each button returns the RoutingDecision and opens a side card with the explanation lines and a link to the lead.

### 15.3 Reset

`resetDemoData()` (server action, OWNER/ADMIN + DEMO_MODE only) deletes leads, activities, tasks, appointments, notifications, messages, projects, demo-created contacts/deals, import jobs and audit logs, resets users' `lastAssignedAt`/`onLeave`, and re-runs the demo generator. Users, branches, localities, templates and settings stay.

---

## 16. UX standards

- **Locale:** `en-IN`. Dates like `28 Oct, 6:30 PM`; relative times ("in 2 h", "3 days overdue"). Currency `₹8,50,000` and compact `₹8.5 L` / `₹1.2 Cr`.
- **Time zone:** always display in IST, whatever the server or browser time zone.
- **Stage labels** use the client's exact wording (e.g., "Discovery / Requirement Meeting", "Closed Lost – No response").
- **Colour:** define design tokens once (CSS variables in the Tailwind 4 `@theme`). Suggested palette, consistent with the proposal: deep navy `#0B1F3A` (sidebar/primary), warm gold `#C9A227` (accent), neutral greys, plus status colours (green won, red lost/overdue, amber due-today, teal simulator, violet preview). Keep it calm and premium, because Elementra is a premium brand.
- **Every page** has a loading skeleton, an empty state with a helpful sentence, and an error boundary.
- **Mobile:** the sidebar becomes a drawer; tables become cards; the lead detail stacks; the Call/WhatsApp buttons are thumb-sized. Check at 390 px width.
- **Honesty:** anything not LIVE carries its badge. Tooltip text example: "Simulator — messages are not sent to real phones until your WhatsApp Business number is approved by Meta."

---

## 17. Testing & quality gates

- **Vitest unit tests** (pure functions, no DB): `phone.ts`, `geo/normalise.ts`, `geo/resolve.ts` (pincode, alias, fuzzy: Borivalli/Goregoan/Kandiwali; NA → none), `routing/decide.ts` (pincode rule beats distance; nearest in radius; Panvel out of area; no location), `routing/assign.ts` (round-robin order; skip on-leave; least-open; fallback to manager), `time.ts` (night lead → next-day due; Sunday toggle), `reminders/rules.ts` (each rule fires once; idempotent keys), `integrations/metaCsv.ts` (prefix stripping, product mapping).
- **Gates before each phase commit:** `npm run lint`, `npm run typecheck`, `npm test`. At the end also `npm run build`.
- **Manual smoke:** the demo script (§19) on desktop and at 390 px width.

---

## 18. Build phases (commit at the end of each)

| Phase | Deliverable | Done when |
|---|---|---|
| **0. Audit & setup** | Read docs, `CLAUDE.md`, `AGENTS.md`, `prisma/schema.prisma`, `app/`, `lib/`, `components/`, `proxy.ts`, `package.json`. Write `project_docs/IMPLEMENTATION_PLAN.md` (existing models and conventions, mapping to §7, decisions, risks). Add `docker-compose.yml`, ports 4610/5610/5611, `.env.example`. | App boots on :4610 against Docker DB :5610; existing pages still work |
| **1. Foundation** | Schema extension + migration `crm_demo_foundation`; role/branch in JWT + session types; guards + scoping; settings module; base seed; nav shell with all groups; `FeatureBadge`; `lib/features.ts`; Build Status page; quick-login chips | Log in as each role; nav shows the right items; Build Status renders |
| **2. The brain** | `phone`, `geo/*`, `routing/*`, `time`, `leads/ingest` + unit tests; RoutingDecision + timeline entries; `/enquire`; Meta webhook route (verify + simulated POST); Demo panel with the 10 scenarios | All scenarios produce the expected decision; tests green |
| **3. Leads workspace** | Leads list + saved views + filters + bulk reassign; lead detail (routing card, timeline, composer, stage changes, lost modal, re-run routing); new-lead form; kanban; Queues page | A lead can be worked from NEW to WON in the UI |
| **4. Follow-up engine** | Tasks; follow-up widget; reminder rules R1–R9 + engine + cron route + `cron:dev` + "Run now"; notification bell (polling + toasts); My Day; appointments + R4/R5; messaging simulator + templates + Inbox | SLA breach demo works with SLA set to 2 min; appointment reminder appears in Inbox |
| **5. Owner view** | Demo data generator + `db:seed:demo` + reset; Dashboard; Reports (3 pivots) + CSV export; Map + Routing playground; Team page with on-leave + stats | The dashboard looks alive on a fresh reset |
| **6. Breadth** | CSV import (Meta); Campaigns; Automations page; Integrations page; Settings tabs; Audit log; Contacts/Companies/Deals wiring (architects, won → Deal); Projects (Preview add-on); Quotations concept + Leave planner + Legacy import placeholders | Every nav item opens a finished-looking screen |
| **7. Polish & hand-off** | Indian formatting pass, empty/loading states, mobile pass, `README.md` (setup, ports, demo, Vercel notes), `STATUS.md` generated from `lib/features.ts`, run §19 end to end, fix rough edges, `npm run build` green | The demo script runs clean twice in a row after `db:reset` |

---

## 19. Acceptance demo script (definition of done)

Run on a fresh `npm run db:reset`, with `npm run dev:all` running.

1. Log in as **Owner** → the Dashboard shows live KPIs and charts with believable numbers.
2. Open **Demo panel** → "Instagram ad — Worli flat" → a toast shows "Assigned to Worli → <next rep>". The owner's bell increments, because the owner gets a copy of new-lead notifications (setting `notifications.ownerCopiesNewLeads`, default on).
3. Open the lead → the routing card explains pincode 400018 → Worli 0.0 km, round-robin, next rep. The timeline shows received → routed → assigned → welcome WhatsApp (Simulator) with ticks.
4. Demo panel → "Misspelt suburb" → routing card: `"goregoan east" → Goregaon East (fuzzy ~98%) → Andheri 4.4 km`.
5. "Navi Mumbai pincode rule" → Worli by rule, even though Andheri is 1.4 km nearer (both distances shown).
6. "Out of area — Surat" and "Borderline — Panvel" → both in **Queues → Out of area** with distances. Accept Panvel for Worli → assigned.
7. "No location" → **Queues → Needs location** → as **Online Desk** user type "Borivalli west" → instant handover to Andheri, with a toast + timeline entry.
8. "Rep on leave" → the routing card lists "Skipped Arjun Nair (on leave)". On **Team**, toggle leave off.
9. **Settings → SLA** set first-contact to 2 min → simulate a lead → **Run reminders now** after 2 min (or wait for `cron:dev`) → an SLA-breach notification appears; set the value back to 60.
10. As an **Andheri rep**: **My Day** shows overdue/today tasks → open one → log call "No answer" → set follow-up "Tomorrow" → the task moves to Upcoming.
11. **Pipeline** → drag a card to Quotation Sent → the timeline logs the stage change. Drag another to Lost → choose "On hold", revive date → saved.
12. Book a showroom visit for tomorrow 11:00 → Run reminders → the appointment reminder appears in **Inbox** (Hindi template if the lead language is set to Hindi).
13. **Reports** → the three pivots match the client's Excel layout → Export CSV downloads.
14. **Map** → branch circles and pins. In the Routing playground type "kandiwali east" → Kandivali East (fuzzy) → Andheri 8.7 km. Then type "Kalyan West" → out of area (34.3 km from Andheri).
15. **Build Status** → the done / simulator / in-progress board, grouped by proposal week.
16. Open the app on a phone-width viewport → leads list as cards, Call/WhatsApp buttons work.

---

## 20. Out of scope (do NOT build now)

Native mobile apps · real WhatsApp/Meta/Google calls (stubs only) · multiple WhatsApp numbers or brands · billing, GST invoices, payment gateway · AI calling / voice bot · email sending (digest email is a placeholder) · multi-tenancy · i18n of the UI (only message templates are bilingual) · granular permission matrix beyond §12 · background job infrastructure (queues/workers) · PostGIS (haversine in TS is enough) · real-time websockets.

---

## 21. Things that must stay true

- No real customer data from the client's sheet in seed data, fixtures, screenshots or tests.
- No secrets in the repo. `.env.example` only has placeholders.
- Never bind port 3000 or 5432.
- Existing Contacts/Companies/Deals and login keep working.
- Every automatic decision is explained in the lead timeline.
