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
| 4. Follow-up engine | ⏳ | |
| 5. Owner view | ⏳ | |
| 6. Breadth | ⏳ | |
| 7. Polish & hand-off | ⏳ | |
