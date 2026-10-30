# Elementra CRM — Implementation Plan

> Living document. Written at Phase 0 (2026-10-28) and updated in every later phase.
> Source of truth for *what* to build: `01_PRODUCT_AND_DEMO_SPEC.md` + `02_REFERENCE_DATA.md`.
> This file records how the spec maps onto the code that already exists, and the decisions made where the spec is silent.

---

## 1. Audit of the existing codebase

### 1.1 Stack & versions (from `package.json` / lockfile)

| Layer | Version | Notes |
|---|---|---|
| Next.js | 16.3.6 | App Router, `proxy.ts`, Turbopack dev. **Cache Components are off** (`next.config.ts` is empty), so the previous caching model applies: pages that read the session are dynamic; mutations call `revalidatePath`. |
| React / React DOM | 19.2.8 | |
| TypeScript | ^5, `strict: true` | path alias `@/*` → repo root |
| Prisma / @prisma/client | 6.19.3 | Postgres. Stay on 6 (spec §4). |
| next-auth | ^4.24.15 | Credentials + JWT |
| Tailwind CSS | 4 (`@tailwindcss/postcss`) | tokens in `app/globals.css` `@theme` |
| lucide-react | ^1.48 | icon set (reuse; don't add another) |
| clsx + tailwind-merge | — | `cn()` in `lib/utils.ts` |
| bcryptjs | ^3 | password hashing |
| ESLint 9 | `eslint-config-next` core-web-vitals + typescript | `npm run lint` = `eslint` |
| Node / npm (this machine) | 20.20.2 / 10.8.2 | |
| **Added in Phase 0** | `tsx` (dev), `vitest@3` (dev) | see Decision D2 |

### 1.2 Scripts

Before Phase 0: `dev` (port 3000), `build`, `start`, `lint`, `db:generate`, `db:push`, `db:migrate`, `db:seed` (via `ts-node`), `db:studio`, `postinstall` (`prisma generate`).

After Phase 0 (merged with spec §5):

| Script | Command | Status |
|---|---|---|
| `dev` | `next dev -p 4610` | ✅ |
| `start` | `next start -p 4610` | ✅ |
| `build`, `lint` | unchanged | ✅ |
| `typecheck` | `tsc --noEmit` | ✅ new |
| `test` | `vitest run` | ✅ new |
| `db:up` / `db:down` | `docker compose up -d --wait db` / `docker compose stop db` | ✅ new |
| `db:migrate` | `prisma migrate dev` | ✅ unchanged |
| `db:seed` | `prisma db seed` → `tsx prisma/seed.ts` | ✅ runner switched from ts-node to tsx |
| `db:reset` | `prisma migrate reset --force` | ✅ Phase 0; gains `&& npm run db:seed:demo` in Phase 5 |
| `db:studio` | `prisma studio --port 5611` | ✅ |
| `db:generate`, `db:push`, `postinstall` | unchanged | ✅ kept |
| `db:seed:demo` | `tsx prisma/seed-demo.ts` | Phase 5 (file doesn't exist yet) |
| `cron:dev` | `tsx scripts/cron-dev.ts` | Phase 4 |
| `dev:all` | `concurrently -k "npm:dev" "npm:cron:dev"` | Phase 4 |

Scripts that point at files from later phases are added in the phase that creates those files, so every commit's scripts run.

### 1.3 Folder conventions

```
app/
  layout.tsx                 root: Inter font, <AuthProvider> (SessionProvider)
  page.tsx                   redirect → /dashboard
  globals.css                Tailwind 4 @theme (brand = indigo #4f46e5) + .field / .btn component classes
  (auth)/login/              page.tsx (server) + login-form.tsx (client, signIn("credentials"))
  dashboard/
    layout.tsx               server layout: requireUser(), sidebar NAV array (4 items), sign-out
    page.tsx                 "Overview": contact/company counts + deal pipeline by DealStage
    contacts|companies|deals/page.tsx   server components: list + inline create form
    actions.ts               all Server Actions ("use server"), FormData in, void out, revalidatePath
    sign-out-button.tsx
  api/auth/[...nextauth]/route.ts
  api/health/route.ts        SELECT 1
components/providers/auth-provider.tsx
lib/
  auth.ts                    authOptions + requireUser()
  prisma.ts                  PrismaClient singleton (named + default export `prisma`)
  format.ts                  formatMoney(paise), STAGE_LABELS (DealStage)
  utils.ts                   cn()
types/next-auth.d.ts         Session/User/JWT augmentation: id, role "ADMIN" | "MEMBER"
prisma/schema.prisma, prisma/seed.ts
proxy.ts                     route protection
```

Conventions observed and to be kept: server components query Prisma directly (no API layer for reads); server actions live in an `actions.ts` next to the pages; kebab-case file names; named exports; Tailwind utility classes inline plus a few `@apply` component classes; very light comments (one line, explaining *why*).

### 1.4 UI components available

There is **no component library** (no shadcn/ui, no Radix, no toasts). What exists: the `.field` and `.btn` CSS classes, `cn()`, lucide icons and the `AuthProvider`. Per spec §4 ("don't add a second component library"), Phase 1 adds small local primitives under `components/ui/` (card, badge, button variants, tabs, dialog via `<dialog>`, empty state, skeleton), and `sonner` for toasts.

### 1.5 Auth setup

- `lib/auth.ts` → NextAuth v4 `CredentialsProvider` (`id: "credentials"`). `authorize()` lowercases the email, compares bcrypt hash, throws a user-facing message on failure (same message for unknown user / wrong password).
- `session.strategy = "jwt"`, 30-day max age, custom pages `signIn`/`error` → `/login`.
- `jwt` callback copies `user.id` and `user.role` into the token at sign-in; `session` callback copies `token.id`/`token.role` into `session.user`.
- `requireUser()` = `getServerSession(authOptions)` → throws `Error("Unauthorized")` if missing. Used in the dashboard layout and every server action.
- `types/next-auth.d.ts` hard-codes the role union `"ADMIN" | "MEMBER"`.
- **`proxy.ts`**: `getToken({ req, secret })` from `next-auth/jwt`. `/login` with a token → redirect to `/dashboard`; any matched path without a token → redirect to `/login?callbackUrl=…`. Matcher: `["/dashboard/:path*", "/login"]`. This already follows the Next 16 `proxy` convention (named `proxy` export, Node runtime by default). Public routes the spec needs (`/enquire`, `/api/webhooks/*`, `/api/public/*`, `/api/cron/*`) are **not** in the matcher, so they stay public and check their own secrets.

Verified in Phase 0 with curl on :4610: unauthenticated `/dashboard` → 307 to `/login?callbackUrl=%2Fdashboard`; credentials login → 200 and a session with `role: "ADMIN"`; `/dashboard`, `/contacts`, `/companies`, `/deals` → 200; `/login` while signed in → 307 to `/dashboard`; wrong password → 401.

### 1.6 Existing Prisma models

Enums: `Role { ADMIN, MEMBER }`, `DealStage { LEAD, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST }`, `ActivityType { NOTE, CALL, EMAIL, MEETING, TASK }`.

| Model | Fields |
|---|---|
| `User` | id (cuid), name, email (unique), passwordHash, role `Role` @default(MEMBER), createdAt, updatedAt · relations: ownedContacts, ownedDeals, activities |
| `Company` | id, name, domain?, industry?, phone?, createdAt, updatedAt · contacts, deals · @@index(name) |
| `Contact` | id, firstName, lastName?, email?, phone?, title?, companyId? (SetNull), ownerId? (SetNull), createdAt, updatedAt · deals, activities · @@index(companyId), @@index(email) |
| `Deal` | id, title, **amount Int in paise** @default(0), currency "INR", stage `DealStage` @default(LEAD), closeDate?, companyId?, contactId?, ownerId?, timestamps · activities · @@index(stage) |
| `Activity` | id, type `ActivityType` @default(NOTE), **body String (required)**, dueAt?, doneAt?, contactId? (Cascade), dealId? (Cascade), userId? (SetNull), createdAt · @@index(contactId), @@index(dealId) |

No NextAuth adapter tables (JWT only). **No migrations existed** in the repo (the README said "first run: name it init").

### 1.7 Existing seed

`prisma/seed.ts` upserts one ADMIN from `SEED_ADMIN_EMAIL/PASSWORD/NAME` (resets the password on re-run). Throws if the env vars are missing. Kept as the first step of the Phase 1 base seed.

---

## 2. Schema merge plan (spec §7 → existing schema)

Principle: **extend, never duplicate**. One migration for the whole foundation: `crm_demo_foundation` (Phase 1), on top of the `init` baseline created in Phase 0.

### 2.1 Enums

| Enum | Action |
|---|---|
| `Role` | **Change values** `ADMIN, MEMBER` → `OWNER, ADMIN, SALES_MANAGER, PRESALES, SALES_REP`. Default becomes `SALES_REP`. Data mapping: `ADMIN → ADMIN`, `MEMBER → SALES_REP`. Prisma's generated SQL (create `Role_new`, cast via text) would fail on `MEMBER` rows, so the migration is **hand-edited**: add the new values first, `UPDATE "User" SET role='SALES_REP' WHERE role='MEMBER'`, then swap to the new type. |
| `ActivityType` | **Add values** `WHATSAPP, SHOWROOM_VISIT, STAGE_CHANGE, ASSIGNMENT, HANDOVER, FOLLOW_UP_SET, MESSAGE_SENT, APPOINTMENT, ROUTING, SYSTEM`. **Keep `TASK`** (existing value; may be referenced by existing rows). |
| `DealStage` | Unchanged. Won leads create `Deal(stage = WON)`. |
| All other spec enums | New, exactly as spec §7 (`BranchKind`, `AssignmentStrategy`, `LeadStage`, `LostReason`, `LeadSource`, `IntakeChannel`, `Product`, `Priority`, `LocationStatus`, `GeoMethod`, `RoutingRule`, `CallOutcome`, `TaskType`, `TaskStatus`, `AppointmentStatus`, `TemplateCategory`, `TemplateStatus`, `MessageStatus`, `ContactKind`, `CompanyKind`, `ProjectStage`). |

### 2.2 `User` (add fields only)

| Field | Type | Note |
|---|---|---|
| role | `Role @default(SALES_REP)` | existing column, enum migrated as above |
| phone | `String?` | new |
| branchId / branch | `String?` → `Branch?` | new |
| isActive | `Boolean @default(true)` | new; `authorize()` will reject inactive users |
| receivesLeads | `Boolean @default(true)` | new |
| onLeave | `Boolean @default(false)` | new |
| onLeaveUntil | `DateTime?` | new |
| lastAssignedAt | `DateTime?` | new (round-robin cursor) |
| relations | `ownedLeads Lead[] @relation("LeadOwner")`, `handedOverLeads Lead[] @relation("LeadHandedOverBy")`, `tasks Task[] @relation("TaskAssignee")`, `hostedAppointments Appointment[]`, `notifications Notification[]`, `auditLogs AuditLog[]`, `designedProjects` / `supervisedProjects` | new back-relations (see 2.6) |

Existing `ownedContacts`, `ownedDeals`, `activities` stay.

### 2.3 `Contact`

| Field | Type | Note |
|---|---|---|
| kind | `ContactKind @default(CUSTOMER)` | new |
| phoneE164 | `String? @db.VarChar(16)` + `@@index([phoneE164])` | new; existing free-text `phone` kept for display/manual entry |
| leads | `Lead[] @relation("LeadContact")` | new |
| influencedLeads | `Lead[] @relation("LeadArchitect")` | new |

Existing `firstName/lastName/email/phone/title/companyId/ownerId` are reused as-is. An architect = `Contact(kind=ARCHITECT, title="Architect")` linked to its firm via the existing `companyId`. `createContact` (existing action) also fills `phoneE164` from Phase 2 on, so manually-created contacts dedupe correctly.

### 2.4 `Company`

| Field | Type |
|---|---|
| kind | `CompanyKind @default(OTHER)` |

### 2.5 `Deal`

| Field | Type | Note |
|---|---|---|
| leadId | `String? @unique` | new |
| lead | `Lead? @relation(fields:[leadId], references:[id], onDelete: SetNull)` | new |

`amount` **stays in paise** (existing convention, used by `formatMoney`). Leads store rupees (`estimatedValueInr`, `orderValueInr`) as the spec says; Won → Deal converts with `× 100`. See Decision D4.

### 2.6 `Activity` — merged, not duplicated

The spec's `Activity` (lead timeline) and the existing `Activity` (contact/deal notes) are the same concept, so one table serves both:

| Spec field | Existing / merged field | Action |
|---|---|---|
| id, type, createdAt | same | keep |
| leadId (required in spec) | `leadId String?` + `lead Lead? (onDelete: Cascade)` | **add, optional** — existing rows have no lead; contact/deal activities stay valid |
| callOutcome | `callOutcome CallOutcome?` | add |
| body (optional in spec) | `body String` (required) | **keep required** — every timeline entry (incl. system lines) has text |
| meta | `meta Json?` | add |
| actorId (null = system) | existing **`userId`** + `user` relation | **reuse**; `null` = "Elementra CRM" (system) |
| — | dueAt, doneAt, contactId, dealId | keep (existing) |
| @@index([leadId, createdAt]) | | add |

### 2.7 New models

`Branch`, `BranchPincode`, `Locality`, `Lead`, `RoutingDecision`, `Task`, `Appointment`, `Notification`, `MessageTemplate`, `OutboundMessage`, `Project`, `AppSetting`, `AuditLog`, `ImportJob` — as spec §7, with these additions where the spec left relations as bare IDs (needed to show names without extra queries):

| Model.field | Added relation |
|---|---|
| `Lead.handedOverById` | `handedOverBy User? @relation("LeadHandedOverBy")` |
| `Task.assigneeId` | `assignee User @relation("TaskAssignee")` |
| `Appointment.hostId` | `host User? @relation("AppointmentHost")` |
| `Notification.userId` | `user User @relation(onDelete: Cascade)` |
| `AuditLog.actorId` | `actor User? @relation(onDelete: SetNull)` |
| `Project.designerId` / `supervisorId` | `designer` / `supervisor User?` (named relations) |
| `Project.branchId` | `branch Branch` |

`RoutingDecision.chosenBranchId/chosenUserId/actorId` and `Task.createdById` stay plain IDs (only displayed via the explanation lines).

### 2.8 Migration plan

1. **Phase 0 (done):** `20261028071627_init` — baseline of the schema as received. Applied locally.
2. **Phase 1:** edit `schema.prisma`, run `prisma migrate dev --create-only --name crm_demo_foundation`, hand-edit the `Role` section (2.1), then `prisma migrate dev`. Verify the existing admin still logs in and is `ADMIN`.
3. Later phases only add columns/indexes if needed (`crm_<topic>` names). No destructive changes.
4. **Production / existing databases:** if a database was previously created with `db push` (no migration history), mark the baseline as applied first: `npx prisma migrate resolve --applied 20261028071627_init`, then `npx prisma migrate deploy`. Documented in the README.

---

## 3. Route / page map

### 3.1 Existing pages — extended

| Route | Change |
|---|---|
| `/login` | + demo quick-login chips when `DEMO_MODE=true` (Phase 1) |
| `/dashboard` (Overview) | replaced by the owner/manager dashboard (Phase 5); reps see "My numbers". The deal-stage summary moves to the Deals page header. |
| `/dashboard/contacts` | + kind filter (Customers / Architects), phoneE164, contact → leads list (Phase 6) |
| `/dashboard/companies` | + kind filter (Architect firms / Builders), "Leads influenced" + "Won value" for architect firms (Phase 6) |
| `/dashboard/deals` | + lead link, deals created from won leads (Phase 6). Existing create/stage-change forms keep working. |
| `app/dashboard/layout.tsx` | sidebar → grouped nav (Work / Insights / Customers / Admin) with role filtering + FeatureBadges; top bar (search, bell, + New lead, user menu); mobile drawer (Phase 1) |

### 3.2 New pages (under `/dashboard` unless noted)

| Route | Phase | Target status |
|---|---|---|
| `/enquire` (public) | 2 | LIVE |
| `/dashboard/demo` (+ floating "Demo" button) | 2 | LIVE (demo mode) |
| `/dashboard/build-status` | 1 | LIVE |
| `/dashboard/leads`, `/leads/new`, `/leads/[id]` | 3 | LIVE |
| `/dashboard/pipeline` | 3 | LIVE |
| `/dashboard/queues` (Needs location · Out of area · Unassigned) | 3 | LIVE |
| `/dashboard/my-day` | 4 | LIVE |
| `/dashboard/appointments` | 4 | LIVE |
| `/dashboard/inbox` | 4 | SIMULATED / IN_PROGRESS (two-way) |
| `/dashboard/reports` | 5 | LIVE |
| `/dashboard/map` (+ Routing playground) | 5 | PREVIEW (map) / LIVE (playground) |
| `/dashboard/team` (+ Leave planner tab) | 5 | LIVE / IN_PROGRESS |
| `/dashboard/imports` | 6 | LIVE (Meta CSV) / IN_PROGRESS (legacy sheet) |
| `/dashboard/campaigns` | 6 | LIVE / IN_PROGRESS (broadcasts) |
| `/dashboard/automations` | 6 | LIVE |
| `/dashboard/settings?tab=routing|hours|templates|duplicates|integrations` | 6 | LIVE |
| `/dashboard/audit` | 6 | LIVE |
| `/dashboard/projects` (+ `[id]`) | 6 | PREVIEW · add-on |
| `/dashboard/quotations` | 6 | PLANNED · add-on (concept) |

### 3.3 Route handlers

| Route | Phase | Auth |
|---|---|---|
| `GET/POST /api/webhooks/meta/leadgen` | 2 | `hub.verify_token`; `X-Hub-Signature-256` when `META_APP_SECRET` set |
| `POST /api/public/leads` | 2 | `x-api-key` = `PUBLIC_FORM_API_KEY` |
| `GET /api/cron/reminders` | 4 | `Authorization: Bearer $CRON_SECRET` |
| `GET /api/notifications` | 4 | session |
| `GET /api/leads/export` | 5 | session, scoped by `leadWhereForUser` |
| `GET /api/health` | existing | public |

### 3.4 `lib/` layout (adapted from spec §6.1)

| Spec path | Actual path | Why |
|---|---|---|
| `lib/db.ts` | **`lib/prisma.ts`** (existing) | follow existing code |
| `lib/auth/` + `guards.ts` + `scope.ts` | **`lib/auth.ts`** (existing, extended) + **`lib/access.ts`** (`requireRole`, `canSeeLead`, `canEditLead`, `leadWhereForUser`) | a `lib/auth/` folder next to `lib/auth.ts` would make `@/lib/auth` ambiguous to read |
| `lib/domain/**`, `lib/features.ts`, `lib/demo/**`, `lib/data/**` | as spec | |
| `lib/domain/money.ts` | as spec (rupees); `lib/format.ts` keeps `formatMoney` (paise) for Deals | |

---

## 4. Decisions (spec silent or in conflict)

| # | Decision | Reason |
|---|---|---|
| D1 | Work on branch `feature/crm-demo`. `main` had **no commits**, so the first commit on the branch is a **baseline** of the code as received; phase commits follow. Nothing is pushed. | Reviewable diffs per phase. |
| D2 | `vitest@3` instead of the current `vitest@5`. | npm 10.8.2 crashes (`Cannot read properties of null (reading 'edgesOut')`, an arborist peer-set bug) when resolving vitest 5's peer set. vitest 3 installs cleanly. Later package adds are done one at a time and pinned if they hit the same bug. |
| D3 | Prisma seed runner switched `ts-node` → `tsx`. `ts-node` stays installed (unused) to avoid churn; can be removed later. | Spec §4/§5 uses `tsx` for all TS scripts; one runner for seed, seed-demo and cron-dev. |
| D4 | `Deal.amount` stays in **paise**; `Lead` money in **rupees**. Won → Deal multiplies by 100. | Follow existing code (`formatMoney` divides by 100); spec says rupees for leads. |
| D5 | One `Activity` table for leads and contacts/deals; `userId` acts as the spec's `actorId`; `body` stays required; `TASK` enum value kept. | Avoid a duplicate model; keep existing rows valid. |
| D6 | `DateTime` columns use Prisma's default `timestamp(3)` (no `@db.Timestamptz`). | Matches the existing schema; Prisma always reads/writes UTC, so behaviour is identical. All IST maths goes through `lib/domain/time.ts`. |
| D7 | JWT carries `id, role, branchId`; the `jwt` callback re-reads `role/branchId/isActive` from the DB at most every 5 minutes. | A manager's change to someone's role/branch takes effect without a re-login, at negligible DB cost. Deactivated users lose access within 5 min. |
| D8 | `proxy.ts` only authenticates (as today). Role checks happen in pages (`requireRole`) and in every server action / route handler. | Next 16 docs: Server Functions must verify auth themselves; proxy coverage can silently change. |
| D9 | Theme: `--color-brand` becomes deep navy `#0B1F3A` with a gold accent `#C9A227` + status tokens. | Spec §16 palette; existing pages use `bg-brand`/`text-brand`, so they inherit it. |
| D10 | Existing `app/dashboard/actions.ts` (void-returning FormData actions) stays as-is. New actions follow spec §6.2 (`{ ok } | { ok:false, error }`, zod, audit) in per-feature `actions.ts` files. | Keep working code untouched. |
| D11 | Toasts: add `sonner` (none present). Validation: add `zod` (none present). Charts `recharts`, kanban `@dnd-kit/core`, map `leaflet`+`react-leaflet`, CSV `papaparse`, time `date-fns`+`@date-fns/tz`, `concurrently` for `dev:all`. Each added in the phase that needs it. | Spec §4 allow-list. |
| D12 | "Just outside radius" label (scenario 6) = out-of-area with nearest distance ≤ radius + 10 km. | Spec silent; Panvel (31.8 vs 30) qualifies, Surat doesn't. |
| D13 | Out-of-area reference places (§10.4) are stored as `Locality` rows too (with their real state as `city`); routing decides in/out by distance, so no extra flag is needed. Region keywords (§10.4) live in code. | Spec has no "in service area" column; distance already answers it. |
| D15 | `ingestLead(..., { quiet: true })` for CSV imports: no welcome WhatsApp, no notifications. | Backfills of old Meta leads must not message customers again. |
| D16 | R1 (SLA breach) also notifies the business owner when `notifications.ownerCopiesNewLeads` is on. | The demo is presented as the Owner (§19 step 9); a business owner wants SLA breaches anyway. |
| D17 | Snooze = status `SNOOZED` + `snoozedUntil`; the engine wakes snoozed tasks when the time passes. | Gives My Day a real "Snoozed" section (spec §13.6). |
| D18 | Logging a connected call on a NEW lead moves it to Contacted; marking a visit "Visited" moves earlier stages to Discovery / Requirement Meeting. | Spec silent; saves a click and keeps the funnel honest. |
| D19 | `next.config.ts` `devIndicators: false`. | The dev indicator covered the sidebar's Sign out during the demo (which runs on `next dev`). Errors still show. |
| D14 | Demo reset deletes `CUSTOMER` contacts that are linked to leads and deals linked to leads; architects (base seed) and manually created contacts/companies stay. | Spec §15.3 says "demo-created contacts/deals" without defining them. |

---

## 5. Conflicts & risks

| Risk | Impact | Mitigation |
|---|---|---|
| **`prisma migrate reset` is blocked for AI agents** without the user's explicit consent (Prisma 6 safety guard). `npm run db:reset` is part of the definition of done. | I can't run `db:reset` unattended in Phase 7. | Ask the user once for consent covering the local Docker DB (`localhost:5610/elementra_crm`) only. Otherwise use the in-app `resetDemoData()` (deletes demo rows + regenerates, no migrate reset), which the demo flow also uses. |
| Existing production/staging DB (if any) created with `db push` | `migrate deploy` would try to re-create tables. | `prisma migrate resolve --applied …_init` first (README). Need to know if one exists. |
| `Role` enum change | Old `MEMBER` users. | Hand-edited migration maps `MEMBER → SALES_REP`; tested on the local DB before commit. |
| `Deal.amount` is `Int` paise → max ₹2.14 Cr per deal | Very large turnkey orders would overflow. | Fine for the demo (hero deal ₹48 L). Flag for production: migrate to `BigInt` or rupees later. |
| Session staleness (role/branch/on-leave in JWT) | Wrong scope after admin edits. | D7 (5-min refresh). On-leave is never read from the JWT; routing reads the DB. |
| Vercel Hobby crons run once a day | Minute-level reminders don't run in production on Hobby. | `vercel.json` cron at `0 4 * * *` (09:30 IST digest), README explains Pro / external scheduler; local `cron:dev` every 60 s; "Run reminders now" button. |
| npm 10 arborist bug | Some installs may crash. | Install one package at a time; pin a major that resolves. |
| `DEMO_MODE=true` exposes demo passwords via quick-login chips | Anyone could log in on a public deployment. | Chips + demo panel only render when `DEMO_MODE=true`; README: set `false` for any real deployment. |
| Leaflet SSR | `window is not defined` at build. | Client component + `next/dynamic({ ssr:false })` inside a client component (spec §6.2). |
| Port 5432 is already used on this machine by another container | — | Our DB is on 5610 (verified free); app on 4610. |

---

## 6. Phase log

| Phase | Status | Notes |
|---|---|---|
| 0. Audit & setup | ✅ | Baseline commit; `docker-compose.yml` (5610); scripts; `.env.example`; `init` migration; vitest smoke test; README + CLAUDE.md facts. Verified: `db:up` → `db:migrate` → `db:seed` → `dev` on :4610, login + Overview/Contacts/Companies/Deals return 200. |
| 1. Foundation | ✅ | Migration `crm_demo_foundation` (hand-edited Role mapping, verified MEMBER→SALES_REP); JWT carries role + branchId (5-min refresh); `lib/access.ts`; settings module; idempotent base seed (5 branches, 6 pincode rules, 89 localities, 13 demo users, 6 architects, 11 templates, settings); navy/gold theme; grouped role-filtered nav + mobile drawer; FeatureBadge; `lib/features.ts` + Build Status + `npm run status`; quick-login chips. Removed `sign-out-button.tsx` (sign-out moved into the shell). |
| 2. The brain | ✅ | `phone`, `time`, `geo/*` (normalise, Jaro-Winkler, resolve, Google stub), `routing/decide` + `assign` (explanation lines built in place — no separate `explain.ts`), `leads/ingest` + `reroute`, messaging simulator + Cloud API stub, Meta mappers + webhook (verify, signature, simulated payloads, idempotent retries), `/api/public/leads`, `/enquire`, Demo panel with the 10 scenarios + random burst. `npm run demo:check` asserts all 10 scenarios against the DB. Ref codes from a Postgres sequence (`crm_lead_ref_seq` migration). Region keywords are checked before fuzzy matching ("Jaipur, Rajasthan" fuzzy-matched Raipur otherwise). Pages use `requirePageRole()` (redirect) rather than throwing. |
| 3. Leads workspace | ✅ | `lib/data/leads.ts` (all queries via `leadWhereForUser`), saved views + filters + global search (name / phone / EL-ref), bulk reassign / follow-up, CSV export route (moved forward from phase 5), table → cards on phones; lead detail (header actions, stage dropdown with Lost/Won modals, composer: note / call outcome / WhatsApp template preview / book visit, follow-up chips, timeline filters with message ticks, editable details, site change → re-run routing, routing card, related enquiries, deal/project links); new-lead form; dnd-kit kanban with Won/Lost drop zones; Queues (capture location → instant handover, accept / regret / close, assign unassigned). Logging a connected call on a NEW lead moves it to Contacted (spec silent). Workflow verified with a scripted run: handover, accept Panvel, calls, follow-ups, stage rules, Won → Deal + Project, On hold → revive date. |
| 4. Follow-up engine | ✅ | Pure `reminders/rules.ts` (R1–R9 → intents; per-rule unit tests incl. stable dedupe keys) + `engine.ts` (persists idempotently; timeline lines only for things that actually fired; wakes snoozed tasks; stores `engine.lastRun`). `/api/cron/reminders` (Bearer), `npm run cron:dev`, `npm run dev:all` (concurrently), `vercel.json` daily cron `0 4 * * *` (09:30 IST). Bell polls `/api/notifications` every 15 s + toasts (also refreshes on window focus and after demo actions). My Day (overdue / today / upcoming / snoozed; done / snooze / call / WhatsApp). Appointments (visited → Discovery stage, no-show → reschedule call, reschedule creates a new appointment so R4 fires again). Inbox with simulated ticks + simulated replies. Sheets row mapper (client's sheet columns). Verified: SLA = 2 min → R1 after 3 min; appointment tomorrow 11:00 → Hindi reminder in the outbox; repeat run creates nothing. R2 only looks back 7 days so a fresh reset doesn't flood old follow-ups. |
| 5. Owner view | ✅ | Deterministic generator (`lib/demo/generate.ts`, seed 20261028, relative dates) using the real resolver/router; a deterministic adjustment pass guarantees the §9.8 live state (8 needs-location, ~5 SLA breaches, 9 won with 2 handed over, 2 revive reminders, overdue spread across reps with Arjun highest, nurture follow-ups so R3 fires on only a few). `db:seed:demo` (clears + regenerates + one engine pass, ~2 s), `db:reset` = migrate reset + seed:demo, in-app Reset (confirm modal). Dashboard (period tabs, 8 KPIs per §14, 6 single-series charts with validated colours, hover tooltips, value labels and table views; needs-attention + recent activity). Reports (pivots A/B/C + source outcome + lost reasons, date/branch filters, per-report CSV). Map (Leaflet client-only, branch radius circles, pins by stage group) + Routing playground (dry run, shows next rep). Team (branch cards, on-leave / receives-leads toggles with audit, load + performance columns) + Leave planner tab (In progress). Pivot C is shown as Branch → Rep rows rather than a sparse Branch × Rep grid (each rep belongs to one branch). Seen in Chrome: dashboard + map + playground. |
| 6. Breadth | ✅ | Meta CSV import wizard (client-side parse + mapped preview, server import through `ingestLead({quiet:true})` — no welcome messages / notifications for backfills, ImportJob history, duplicate report; re-import creates nothing) + legacy sheet column-mapping preview (In progress); fixture `prisma/fixtures/meta-leads-sample.csv` (15 synthetic rows). Settings tabs (routing mode / out-of-area action / branch radius + strategy / pincode rules; hours + SLA + stale days; templates with live preview + simulated approval status; duplicates; integrations cards with honest status + test buttons). Automations (R1–R9 cards: on/off via `reminders.disabledRules`, thresholds, fired today / this week, last 5 firings, Run now, last run). Campaigns (campaign → ad set → ad performance, manual spend → CPL; broadcasts segment builder with live audience count, send disabled). Audit log with filters + links. Projects list + 8-step stepper + advance (handover sets the 5-year warranty). Quotations concept screen. Contacts (kind tabs, contact page with enquiries / leads influenced, architects' won value), Companies (kind tabs + partner columns), Deals (stage summary moved from the old Overview + lead link); existing create forms keep working and now set `kind` / `phoneE164`. Every nav route verified for all 5 demo roles. |
| 7. Polish & hand-off | ✅ | `npm run build` green. §19 walked in Chrome as Owner / Online Desk / Andheri rep (steps 1–12 by clicking; 13–15 checked earlier), then `npm run demo:acceptance` (resets + asserts the same server paths) run twice in a row: 13/13 both times. 390 px checked with headless Chrome (CDP, mobile viewport, real session): no horizontal overflow on any main page; lead list → cards with thumb-sized Call/WhatsApp. Fixes found in the walkthrough: Next dev indicator covered Sign out (→ `devIndicators: false`); routing card moved to the top of the lead page; `/login` made dynamic so `DEMO_MODE` isn't frozen at build; cards `min-w-0` (dashboard overflow on phones); bell caps toasts at 3 per poll; R1 copies the business owner; browser-extension hydration warning suppressed on `<html>`. README rewritten (setup, ports, demo logins, reset, local reminder runner, Vercel Hobby cron limit). |

---

# Week 2 — Masters, Users & Roles, Qualification, Duplicates, Chatbot, Staging

> Written at Phase W0 (2026-10-30). Source of truth: `06_WEEK2_SPEC_MASTERS_ROLES_QUALIFICATION_CHATBOT.md` (wins over `01` §7 enums and §12 roles).
> Branch: `feature/week2-masters-rbac`, cut from `feature/crm-demo` @ `aa3b802` (there is no local `main` with commits; see D1).

## W.1 Audit summary

- **Starting point:** 47 features in `lib/features.ts` (33 Live), 94 Vitest tests in 30 suites, `demo:check` (10 scenarios) and `demo:acceptance` (§19) green at `aa3b802`. 3 migrations (`init`, `crm_demo_foundation`, `crm_lead_ref_seq`).
- **Enums being replaced:** `LeadStage` (10 values), `LostReason` (6), `LeadSource` (11), `Product` (6), `Role` (5). They're used in **80 files** (list in W.4). `Priority`, `IntakeChannel` and all technical enums stay.
- **Hard-coded business labels** live in two modules (`lib/domain/stages.ts`: stage labels/short labels/colours/order/transitions/legacy parsing; `lib/domain/labels.ts`: `ROLE_LABEL`, `SOURCE_LABEL`, `PRODUCT_LABEL`, `productPhrase`), plus literals in the demo generator/scenarios, Meta/Sheets mappers, `/enquire` and the new-lead form, R3's `staleDays` keyed by stage enum in `AppSetting`, and `"Kitchen"` defaults in `workflow.ts`/`send.ts`.
- **Behaviour tied to specific stages today** (must survive without labels):
  - connected call on NEW → CONTACTED (D18), `firstContactedAt` set when entering CONTACTED;
  - qualifying a located Online-Desk lead hands it over (via-pre-sales mode);
  - appointment "Visited" → Discovery stage (D18);
  - out-of-area "close" → Closed Lost / Others with note;
  - R3 uses `QUOTATION_FOLLOW_UP` for Quotation Sent; R7 only for On hold / Timeline.
- **Access control today:** `lib/access.ts` switches on the `Role` enum (`leadWhereForUser`, `canSeeLead`, `canEditLead`, `isManager`, `requireRole`, `requirePageRole`), ~35 call sites. The JWT carries `role` + `branchId`, refreshed every 5 min (D7). `lib/nav.ts` filters by role arrays. `notify.ts#ownerIds`, `assign.ts` (manager fallback) and R1b/R8/R9 pick recipients by role.
- **Routing already reads branches, pincode rules and localities from the DB on every call** (`loadRoutingContext`), so the Branch and Areas masters only need screens, plus `isActive` filtering.
- **Docs gap:** `project_docs/05_DEMO_REHEARSAL_GUIDE.md` is listed in `project_docs/README.md` but **isn't in the repo**. Until it's added, the regression check is `03_CLIENT_PITCH_AND_DEMO_SCRIPT.md` (15-min talk track) + `npm run demo:check` + `npm run demo:acceptance`.
- **Tooling:** `vercel` CLI is **not installed** → no preview deploy (06 §9). Local DB container `elementra-crm-db` up on 5610.

## W.2 Schema diff (field by field)

### New enums
`StageCategory {OPEN, WON, LOST}` · `DataScope {OWN, BRANCH, ALL}` · `ChatChannel {WHATSAPP, WEBSITE, TEST}` · `ChatStepType {MESSAGE, CHOICE, MULTI_CHOICE, TEXT, NAME, PHONE, AREA}` · `ChatSessionStatus {ACTIVE, COMPLETED, HANDED_OFF, ABANDONED}`.
`IntakeChannel` **gains** `WEBSITE_CHAT`.

### Dropped enums
`LeadStage`, `LostReason`, `LeadSource`, `Product` (type renamed then dropped, see W.3), `Role` (same).

### New models (as 06 §3, with these additions)

| Model | Fields beyond 06 | Why |
|---|---|---|
| `Pipeline` | — | as spec; `autoProducts Product[] @relation("PipelineAutoProducts")` |
| `PipelineStage` | — | as spec; `systemKey` used for the hooks in D-W3 |
| `Source` | `isFallback Boolean @default(false)` | 06 §4.4 "the source flagged as fallback ('Other')" needs a flag |
| `Product` | — | as spec; `leads Lead[] @relation("LeadProducts")` (named implicit m2m `_LeadProducts`) |
| `LookupValue` | back-relations `leadsBudget`, `leadsPossession`, `leadsPropertyType`, `leadsConfiguration`, `usersDesignation` | relation names from 06 §3 notes |
| `Role` | — | as spec (`scope`, `permissions String[]`, `isSystem`, `isLocked`) |
| `ChatbotFlow`, `ChatbotStep`, `ChatMessage` | — | as spec |
| `ChatSession` | `ipHash String?`, `nudgedAt DateTime?`, `@@index([ipHash, createdAt])` | DB rate limit (D-W10); R11 one-nudge idempotency |
| `DuplicateDismissal` | `by User @relation("DuplicateDismissedBy")`, `reason String?` | show who dismissed in the queue |

### `User`

| Field | Change |
|---|---|
| `role Role` (enum) | **removed** → `roleId String` + `role Role @relation(...)` |
| `branchId` / `branch` | kept; relation renamed `@relation("UserHomeBranch")` |
| `extraBranches Branch[] @relation("UserExtraBranches")` | new |
| `reportsToId String?` / `reportsTo` / `reports` | new, `@relation("UserReportsTo")` |
| `employeeCode String? @unique` | new |
| `designationId String?` → `LookupValue @relation("UserDesignation")` | new |
| `mustChangePassword Boolean @default(false)` | new |
| `lastLoginAt DateTime?`, `deactivatedAt DateTime?` | new |
| `dismissedDuplicates DuplicateDismissal[]` | new back-relation |
| kept | `isActive, receivesLeads, onLeave, onLeaveUntil, lastAssignedAt, phone` |

### `Branch`
`users User[] @relation("UserHomeBranch")` (renamed), `extraUsers User[] @relation("UserExtraBranches")` (new). `code` stays `@unique`, now editable in the UI. `isActive` already exists.

### `Lead`

| Field | Change |
|---|---|
| `stage LeadStage`, `lostReason LostReason?` | **removed** → `stageId String` → `PipelineStage` |
| — | `pipelineId String` → `Pipeline` (new, required) |
| `source LeadSource` | **removed** → `sourceId String` → `Source` |
| `products Product[]` (enum list) | **removed** → `products Product[] @relation("LeadProducts")` |
| `budgetBandId`, `possessionTimelineId`, `propertyTypeId`, `configurationId` | new, `String?` → `LookupValue` (named relations) |
| `qualificationScore Int?`, `qualifiedAt DateTime?`, `qualifiedById String?` | new |
| `priorityIsManual Boolean @default(false)` | new |
| `mergedIntoId String?` (+ `mergedInto`/`mergedFrom` self-relation `"LeadMerge"`) | new |
| `chatSessionId String?` | new |
| `whatsappOptOut Boolean @default(false)` | new — chatbot "stop" (06 §8.1 says "opt-out flag on the lead" without naming it) |
| kept | `stageChangedAt, lostNote, reviveAt, priority, possessionDate, budgetNote, …` |
| indexes | `@@index([ownerId, stage])` / `[branchId, stage]` → `[ownerId, stageId]` / `[branchId, stageId]`; + `[pipelineId, stageId]`, `[email]`, `[altPhoneE164]`, `[mergedIntoId]` |

`Activity.meta` for `STAGE_CHANGE` now stores `{ fromStageId, toStageId, fromLabel, toLabel }` so history keeps the label it had (06 §4.2). Old rows (`{from, to}` enum strings) render from `body`, which already contains the labels.

### `AppSetting` keys
- `reminders.staleDays` (keyed by stage enum) → **moves onto `PipelineStage.staleDays`/`staleTaskType`**; key removed from the zod schema.
- `duplicates.policy` (`LINK_SAME_OWNER | WARN_ONLY`) → `duplicates.intakePolicy` (`LINK | MERGE | CREATE_AND_FLAG`), `duplicates.manualPolicy` (`WARN | BLOCK`), `duplicates.windowDays` kept. `getSettings()` maps the old stored value (`LINK_SAME_OWNER→LINK`, `WARN_ONLY→CREATE_AND_FLAG`).
- new `qualification` (weights, required keys, `minBudgetBandId`, hot/warm thresholds), `chatbot` (enabled per channel, nudge minutes 30, expiry hours 24, handoff keywords).

## W.3 Migration approach — **data-mapping, hand-ordered SQL** (chosen)

One migration `20261030xxxxxx_week2_masters_rbac` (+ a small `week2_chatbot` one in W6, `week2_qualification` fields go in the first). Generated with `prisma migrate dev --create-only`, then hand-edited in this order:

1. Create the new enums and the tables that don't clash (`Pipeline`, `PipelineStage`, `Source`, `LookupValue`, `DuplicateDismissal`).
2. **Insert the master rows in SQL with fixed ids** (`stg_new`, `src_instagram_paid`, `role_super_admin`, …): default pipeline + 15 stages, 12 sources, the 5 roles. The seed later upserts by `systemKey`/`name`, so seed and migration agree.
3. `Lead`: add `pipelineId/stageId/sourceId` nullable → `UPDATE` with a `CASE` mapping (`CLOSED_LOST + BUDGET → stg_lost_budget`, …) → `SET NOT NULL` + FKs → drop `stage`, `lostReason`, `source`.
4. `Product`: `ALTER TYPE "Product" RENAME TO "Product_legacy"` → create table `Product` + `_LeadProducts` → insert 7 rows → `INSERT … SELECT unnest(products)` → drop `Lead.products` → `DROP TYPE "Product_legacy"`. (06 §3 gotcha: enum and table share the type namespace.)
5. `Role`: same rename trick → table `Role` → `User.roleId` mapped (`OWNER/ADMIN→Super Admin`, `SALES_MANAGER→Branch Manager`, `SALES_REP→Sales Executive`, `PRESALES→Online Desk`) → drop `User.role` → drop type.
6. Drop `LeadStage`, `LostReason`, `LeadSource`; add the new `User`/`Lead` columns; rename the `User↔Branch` relation (FK name only, no data change).

**Why mapping rather than destructive + reseed:** 06 prefers it; it proves the chain works with `migrate deploy` on a DB that already has data (staging will be created with the old chain if anything is deployed before W1 lands); and local users keep their logins. **Verification before the W1 commit:** (a) apply on the current local DB with data and check counts per stage/source/product/role are unchanged; (b) `prisma migrate reset` on an empty DB (needs consent, see questions); (c) `prisma migrate deploy` against a scratch database `elementra_crm_w2check` on the same container. Fallback if step 4/5 misbehaves: keep the SQL mapping for stages/sources and reseed roles/products only — still no stack change.

## W.4 Auth & sessions

- **Folder:** `lib/auth.ts` → `lib/auth/index.ts` (import path `@/lib/auth` unchanged, so the old "ambiguous path" reason for `lib/access.ts` goes away) + `lib/auth/permissions.ts` (catalogue + groups + descriptions), `lib/auth/current-user.ts` (`getCurrentUser = cache(...)`), `lib/auth/scope.ts` (`leadWhere`, `userWhere`, `canSeeLead`, `canEditLead`, `branchManagersOf`), `lib/auth/guards.ts` (`can`, `requirePermission`, `requirePagePermission`, `requireLeadInScope` → `notFound()`), `lib/auth/escalation.ts` (pure guards 06 §5.4). `lib/access.ts` is deleted once every caller has moved.
- **JWT:** `{ id, name, email }` only. `jwt` callback no longer reads the DB (D7 retired). `types/next-auth.d.ts` drops `role`/`branchId`.
- **Per request:** `getCurrentUser()` loads user + role + permissions + `branchIds` (home + extra) once per request via React `cache()` (pattern from `node_modules/next/dist/docs/01-app/02-guides/data-security.md`). In server actions and route handlers `cache()` doesn't memoise across calls, which is fine (one call per action).
- **Deactivated / missing user:** `getCurrentUser()` returns `null` → pages redirect to `/login?reason=deactivated`; actions/route handlers return 401. `proxy.ts` lets `/login?reason=deactivated` through even with a token (otherwise it would bounce back to `/dashboard`), and the login page calls `signOut({ redirect: false })` to clear the cookie.
- **Login:** `authorize()` sets `lastLoginAt`. `mustChangePassword` → dashboard layout redirects to `/dashboard/account/password` (`/account` redirects there; one shell, one proxy matcher).
- **Enforcement:** every server action and route handler starts with `requirePermission(key)` or `getCurrentUser()` + `leadWhere`. A grep test (`lib/auth/coverage.test.ts`) fails if an exported function in any `app/**/actions.ts` / `route.ts` doesn't reference one of the guards (public routes allow-listed).

## W.5 Refactor list (from the grep; S = stage, L = lost reason, Src = source, P = product, R = role)

| Area | Files | Change |
|---|---|---|
| Masters runtime | `lib/domain/stages.ts` (S L), `lib/domain/labels.ts` (Src P R) | Stage/source/product/role maps deleted. `stages.ts` keeps pure helpers over `StageRef {id,label,category,sortOrder,flags}`: `canTransition`, `isOpen`, `matchLegacyStatus(stages, raw)`, `validatePipeline`. New `lib/data/masters.ts` loads active masters (cached per request). `productPhrase(products: {name}[])`. |
| Domain | `leads/workflow.ts` (S L P), `leads/ingest.ts` (S L Src P), `leads/reroute.ts` (S), `leads/context.ts` (S), `messaging/replies.ts` (S), `messaging/send.ts` (P), `notify.ts` (R), `routing/assign.ts` (R), `settings.ts` (Src) | stage by id + category/flags/systemKey hooks (D-W3); pipeline auto-selection; source via integration keys; manager fallback = branch manager by scope; owners = Super Admin users (D-W6) |
| Reminders | `reminders/rules.ts` (S L R), `engine.ts` (S L), `rules.test.ts` | snapshot carries `stage {category, isInitial, staleDays, staleTaskType, askReviveDate, label}`; R1 = `isInitial`; R3 = `stage.staleDays`; R7 = LOST + `askReviveDate`; recipients by scope/permission; + R10, R11 |
| Integrations | `integrations/metaLead.ts` (L Src P), `sheets.ts` (S Src P), `metaCsv.ts`, `meta.test.ts` | mappers take a `MasterIndex` (integration keys → source id, Meta answer keys → product id, legacy status → stage id); still pure |
| Data/reports | `lib/data/leads.ts` (S L Src P R), `dashboard.ts` (S Src R), `reports.ts` (S L Src P R), `sla.ts` (S) | filters by ids; funnel/pivots from stage master per pipeline (pipeline filter); lost-reasons chart = LOST stages; all queries via `leadWhere`/`userWhere` |
| Lead pages | `leads/page.tsx`, `lead-table.tsx`, `leads/actions.ts`, `leads/new/new-lead-form.tsx`, `leads/[id]/page.tsx`, `stage-control.tsx`, `details-panel.tsx`, `components/lead-badges.tsx` | dropdowns from masters (active only; inactive greyed); stage badge colour from `stage.color`; Lost modal → LOST-stage picker |
| Pipeline | `pipeline/page.tsx`, `kanban.tsx` | pipeline switcher (remembered in a cookie, D-W8), columns = active OPEN stages, Won/Lost pickers |
| Other pages | `appointments/actions.ts`, `campaigns/page.tsx`, `deals/page.tsx`*, `contacts/page.tsx`*, `contacts/[id]/page.tsx`, `companies/page.tsx`*, `map/page.tsx`, `projects/*`, `queues/page.tsx`, `team/page.tsx`, `reports/page.tsx`, `settings/settings-forms.tsx`, `imports/import-wizard.tsx`, `api/leads/export`, `api/reports/export`, `api/public/leads`, `enquire/actions.ts`, `enquire/enquiry-form.tsx`, `lib/features.ts` | labels/filters from masters (* = `DealStage`/`"NEW"` false positives — `DealStage` stays) |
| Role checks (~35 call sites) | every `requireRole`/`requirePageRole`/`isManager`/`isAdmin`/`canReassign` in `app/**`, `lib/nav.ts`, `components/shell/app-shell.tsx`, `app/dashboard/layout.tsx` | → `requirePermission` / `can`; nav items declare `perm` |
| Demo/seed/scripts | `lib/demo/generate.ts` (≈60 enum literals), `pools.ts`, `scenarios.ts`, `reference.ts`, `prisma/seed.ts`, `seed-demo.ts`, `scripts/check-acceptance.ts`, `check-scenarios.ts` | look up stages by `systemKey`, sources/products by name, roles by name |
| Tests | `stages.test.ts`, `access.test.ts` (→ `lib/auth/scope.test.ts`), `rules.test.ts`, `meta.test.ts`, `routing.test.ts` | rewritten on fixture masters; behaviour assertions kept |

Allowed remaining exceptions (to be listed in `STATUS.md`): seed files and the demo generator name seeded rows (that's their job); `systemKey` strings in the D-W3 hooks; `LookupValue.listKey` constants (06 §4.7: "the code knows the key").

## W.6 Route / page map (new)

| Route | Permission | Phase |
|---|---|---|
| `/dashboard/masters` → first permitted tab | any masters/people perm | W2 |
| `/dashboard/masters/pipelines?id=` (list + stage editor, drag reorder, merge stage, duplicate pipeline) | `pipelines.manage` | W2 |
| `/dashboard/masters/branches`, `/branches/[id]?tab=details|pincodes|members` (Leaflet pin picker) | `branches.manage` | W2 |
| `/dashboard/masters/sources`, `/products`, `/areas` (+ Test), `/lists?key=BUDGET_BAND` | `masters.manage` | W2 |
| `/dashboard/masters/users` (+ drawer, temp password, deactivate-with-reassign) | `users.view` / `users.manage` | W3 |
| `/dashboard/masters/roles`, `/roles/[id]` (clone, Preview as…) | `roles.manage` | W3 |
| `/dashboard/team-performance` (Insights; person → audit + tasks) | `team.performance` | W3 |
| `/dashboard/account`, `/dashboard/account/password`; `/account` → redirect | signed in | W3 |
| `/dashboard/settings?tab=qualification` | `settings.manage` | W4 |
| `/dashboard/queues?tab=duplicates` | `queues.duplicates` | W5 |
| `/dashboard/chatbot?tab=flow|test|conversations|settings` | `chatbot.manage` | W6 |
| `/chat` (public, mobile-first) + "Chat with us" on `/enquire` | public | W6 |
| `POST /api/public/chat` (start/message, visitor cookie, honeypot, rate limit) | public | W6 |
| `POST /api/leads/duplicate-check` (live check on blur; scope-aware answer) | `leads.create` | W5 |

Moved: Settings → Routing keeps routing mode / out-of-area action; branch radius, strategy and pincode rules move to the Branches master. Settings → Hours keeps SLA; stale days move to the stage editor. Existing `/dashboard/team` (branch cards, on-leave) stays.

Shared UI: `components/master-table.tsx` (search, show inactive, Used by N, drag order via `@dnd-kit/core` already installed, row actions, side drawer) + `lib/domain/masters/actions-core.ts` (create/update/toggle/merge/delete-if-unused with audit before → after).

## W.7 Decisions (Week 2)

| # | Decision | Reason |
|---|---|---|
| D-W1 | Branch from `feature/crm-demo` (no local `main` with commits). One commit per phase W1–W7. Nothing pushed. | 07 §4 |
| D-W2 | Lost stages keep the client's numbering: `10. Closed Lost – Budget`, `10. Closed Lost – Competitor`, `11. … Timeline`, `12. … No response`, `13. … On Hold`, `14. … Others` → **15 stage rows** for the "14 statuses". `askReviveDate` on On Hold + Timeline; `requiresQualification` on stage 3 and every later OPEN stage. | 02 §1 + 06 §4.2 |
| D-W3 | Stage-specific automations use `systemKey` hooks and silently no-op if the stage is missing/inactive: `CONTACTED` (connected call on the initial stage; `firstContactedAt`), `DISCOVERY_MEETING` (visit marked Visited), `QUALIFIED`-style handover = **first `requiresQualification` stage**, out-of-area close = **first active LOST stage with `systemKey LOST_OTHERS`, else the last LOST stage**. Labels are never compared. | 06 §2 forbids labels, not stable keys; keeps D18 behaviour |
| D-W4 | Transitions: within OPEN stages forward any, one step back (by `sortOrder` of active stages); OPEN → any WON/LOST; WON/LOST → OPEN needs `pipeline.reopen`. Moving between pipelines: same category + nearest `sortOrder`, confirm dialog. | 02 §1 rule, generalised |
| D-W5 | `Source.isFallback` flag (seeded on "Other"); unmapped intake values are counted from `Lead.rawPayload`/import errors and shown on Integrations. | 06 §4.4 |
| D-W6 | "Business owner" recipients (owner copies, R9 all-branch digest) = active users whose role `isLocked` (Super Admin). "Branch manager of X" (R1b, R9 branch digest, assignment fallback, dedupe notifications) = active users with scope `BRANCH` whose home or extra branches include X, home-branch first. "Online Desk lead" (R8) = users with `queues.needsLocation`. | Replaces role-enum lookups without labels |
| D-W7 | `OWNER` and `ADMIN` both become Super Admin (06 §5.2). Aarav Mehta stays the demo "Owner" by name; the seed admin also gets owner copies (harmless). | spec mapping |
| D-W8 | Kanban pipeline choice remembered in a cookie (`kanban_pipeline`), not the DB. | "remembered per user" on the same device is enough for the demo; no schema |
| D-W9 | Out-of-area leads stay visible to `queues.outOfArea` holders across branches (current manager behaviour); executives never see them. Worli manager → sees out-of-area leads with no branch, never Pune-branch leads. | 06 §5.3 `unroutedClause` |
| D-W10 | Chat rate limit is DB-based: `ChatSession.ipHash` (SHA-256 of IP + `NEXTAUTH_SECRET`) and a count of inbound `ChatMessage`s in the last 10 min (30 max). | memory limits don't work on serverless |
| D-W11 | Chatbot "skip": allowed on optional steps immediately, and after 2 failed retries; required steps hand off after 2 retries. Session resume = same visitor cookie / phone + ACTIVE status. | 06 §8.1 |
| D-W12 | Merge is idempotent: re-running on an already-merged secondary returns "already merged into EL-…" without changes. | 06 §7.4 |
| D-W13 | Staging deploy: no Vercel CLI here → stop at deploy-ready; `STAGING.md` uses build command `prisma generate && prisma migrate deploy && next build` with `directUrl = env("DIRECT_URL")` for Neon. | 06 §9 |
| D-W14 | Demo quick-login chips gain Vikram Sethi (Regional) and are grouped by role. Demo panel requires `demo.use`. | 06 §5.7, §9 |
| D-W15 | Seed users mapped per 06 §5.2; Vikram Sethi = Branch Manager, home Worli, extra Andheri + Tardeo, `receivesLeads=false`. Acceptance step 7's "Regional Manager" role is created by cloning during the walkthrough, not seeded. | 06 §5.7, §11 |

## W.8 Risks

| Risk | Mitigation |
|---|---|
| Big-bang refactor (80 files) in W1 breaks the demo between commits | W1 is one commit only after lint/typecheck/test + `demo:check` + `demo:acceptance` pass; old helpers removed only when the compiler finds no callers |
| Hand-ordered migration (enum ↔ table rename) | verified three ways (W.3); fixed ids shared with seed |
| `prisma migrate reset` is blocked for agents without consent | ask once (below); otherwise verify empty-DB apply on a scratch database instead |
| Scope bugs leak data | all lead/user queries via `leadWhere`/`userWhere`; scope + 404 tests; guard-coverage grep test; final permissions audit (07 follow-up prompt) |
| Stale permissions | none by design: DB read per request (D7 retired) |
| `/login` bounce loop for deactivated users | proxy exception for `reason=deactivated` (W.4) |
| Kanban/report queries slower with joins | indexes on `stageId`/`pipelineId`; masters loaded once per request |
| Missing 05 rehearsal guide | use 03 + scripted checks until it's added |
| Chatbot abuse on a public URL | honeypot, 500-char cap, DB rate limit, text-only rendering, TEST channel by default in the console |
| Vercel Hobby cron once a day → R10/R11 nudges only daily on staging | documented; "Run reminders now"; external pinger option in `STAGING.md` |

## W.9 Phase log (Week 2)

| Phase | Status | Notes |
|---|---|---|
| W0. Audit & plan | ✅ | This section. No code changed. |
| W1. Masters data layer | ⏳ | |
| W2. Masters admin UI | ⏳ | |
| W3. Users & roles | ⏳ | |
| W4. Qualification | ⏳ | |
| W5. Duplicates | ⏳ | |
| W6. Chatbot | ⏳ | |
| W7. Staging & acceptance | ⏳ | |
