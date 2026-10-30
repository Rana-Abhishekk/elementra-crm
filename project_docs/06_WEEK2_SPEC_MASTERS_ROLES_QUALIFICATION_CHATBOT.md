# Elementra CRM — Week 2 Spec: Masters, Users & Roles, Qualification, Duplicates, Chatbot, Staging

> **Status:** addendum to `01_PRODUCT_AND_DEMO_SPEC.md`. Where they conflict, **this document wins**.
> **Inputs:** client meeting of 28 Oct 2026 + the contract milestone table (below).
> **Read with:** `01` (architecture, routing, reminders), `02` (seed values), the repo's `CLAUDE.md`, `project_docs/IMPLEMENTATION_PLAN.md`, `STATUS.md`.

---

## 0. Contract milestones (from the signed schedule)

| Trigger / event | Deliverables |
|---|---|
| Project kickoff | Project initialisation, environment setup, discovery session, architecture design |
| **End of Week 2** ← *this work* | **Core CRM foundation built, lead qualification logic, duplicate handling, and chatbot flow ready on staging** |
| End of Week 5 | Integrations (WhatsApp, Meta, Sheets, Maps), automation rules, reporting dashboards, internal UAT testing |
| Post-completion | UAT sign-off, required changes/refinements, source code handover, go-live deployment |

From the meeting, "core CRM foundation" now also includes: **admin-managed masters** (status/pipeline, branch, source, product, user, role) and **branch-based user & role management**.

> The **Build Status** page and `lib/features.ts` must switch from the old "5-week plan" grouping to these four milestones.

---

## 1. What the client asked for, in plain words (for Rana)

**"Master"** is standard Indian business-software vocabulary (Tally, ERPs, Zoho): a **list of options that an admin maintains** and that appears in dropdowns across the app. "Source master" = the admin's list of lead sources. Technically each master is just a lookup table plus an admin screen. Nothing more mysterious than that.

| Client said | What it means | What we build |
|---|---|---|
| "Admin decides the statuses for everyone" + "status master" | Pipeline stages must not be hard-coded. The admin edits them once and everyone sees the same list. | **Pipelines & Statuses master**: rename stage headings, reorder, add/remove, colours, won/lost, reflected **everywhere** (kanban, badges, filters, reports, reminders) |
| "Create new pipelines" | Different kinds of deals may need different stage lists (e.g., Full-home / Turnkey vs Kitchen-only) | Multiple pipelines. Each lead belongs to one. The kanban has a pipeline switcher. |
| "Branch master" | Admin adds or edits Experience Centres | Branch CRUD: location, service radius, pincode rules, assignment style. A new branch **immediately changes routing**. |
| "Source master" | Admin adds new lead source types (e.g., "Housing.com", "Exhibition") | Source CRUD. Dropdowns, filters, reports and integration mappings use it. |
| "Product master" | Admin maintains the product list | Product CRUD. Used in lead forms, the chatbot's options, filters, reports and pipeline auto-selection. |
| "User master" + "Role master" | Admin creates staff logins and decides **what each kind of person can do and see** | Users and Roles screens: a simple version of AWS IAM. |
| "Worli manager can't see Pune's employees or data" | Data visibility by branch | Every role has a **data scope**: Own / Branch / All. Managers are tied to one or more branches. |
| "Employees can't see each other's leads; the manager can" | Sales executives see only their own; managers see their branch | Scope = Own for executives, Branch for managers |
| "Super user sees every manager working" | Owner sees everything plus how each manager and team is performing | Super Admin role (All) + a **Team performance** page + audit by person |
| *(illegible notes)* | Probably more lists | A generic **Other lists** master (budget bands, possession timeline, property type, BHK, designation, …) so new lists need no code |

---

## 2. Design principles

1. **No hard-coded business values in code.** Stages, sources, products, branches, roles and option lists come from the database. Code may use **categories** (OPEN/WON/LOST) and **flags** (`isInitial`, `requiresQualification`), never labels.
2. **Never hard-delete something that is in use.** Allow delete only when unused. Otherwise **deactivate** (hidden from dropdowns; old records still show it, greyed) or **merge into** another value (moves the records).
3. **One place decides visibility:** `lib/auth/scope.ts`. **One place decides permission:** `can(user, permission)`. Every server action and route handler uses them. The UI hides what you can't do, but the server is the real gate.
4. **Permissions take effect on the next request.** The JWT carries only the user id. Role and permissions are loaded from the DB per request (React `cache()`), so changing a role or deactivating a user applies immediately, with no re-login.
5. **Everything an admin changes is audited** (who, what, before → after).
6. **Keep it simple.** One role per user. Three data scopes. Permissions are checkboxes. No policy language, no deny rules, no per-record sharing.

---

## 3. Data model changes (Prisma)

> Replace the enums `LeadStage`, `LostReason`, `LeadSource`, `Product`, `Role` (and `Priority` stays an enum) with tables. Keep `IntakeChannel` and the other technical enums.
> **Migration gotcha:** in Postgres, an enum type and a table share the type namespace. A table named `Product` can't be created while the enum type `Product` still exists. Drop or convert the enum column and type first (separate migration or hand-ordered SQL).
> **Data:** all existing data is synthetic. A migration that maps old enum values to the new seeded rows is preferred. If that's too fiddly, a destructive migration followed by `db:seed` + `db:seed:demo` is acceptable. In both cases the migration chain must apply cleanly on an empty DB **and** via `prisma migrate deploy` on staging.

```prisma
// ---------- Pipelines & statuses ----------
enum StageCategory {
  OPEN
  WON
  LOST
}

model Pipeline {
  id           String          @id @default(cuid())
  name         String          @unique              // "Sales — Kitchens & Wardrobes"
  description  String?
  isDefault    Boolean         @default(false)      // exactly one
  isActive     Boolean         @default(true)
  sortOrder    Int             @default(0)
  autoProducts Product[]       @relation("PipelineAutoProducts") // optional auto-selection
  stages       PipelineStage[]
  leads        Lead[]
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
}

model PipelineStage {
  id                    String        @id @default(cuid())
  pipelineId            String
  pipeline              Pipeline      @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
  label                 String                       // the heading shown everywhere
  category              StageCategory
  sortOrder             Int
  color                 String        @default("#64748B")
  isInitial             Boolean       @default(false) // new leads start here (exactly one per pipeline)
  isActive              Boolean       @default(true)
  requiresQualification Boolean       @default(false) // gate: lead must pass qualification to enter
  askReviveDate         Boolean       @default(false) // LOST stages like "On hold", "Timeline"
  requiresNote          Boolean       @default(false)
  staleDays             Int?                          // reminder R3 threshold for this stage
  staleTaskType         String?                       // "FOLLOW_UP" | "QUOTATION_FOLLOW_UP"
  probability           Int?                          // 0–100, optional weighted pipeline
  systemKey             String?                       // stable seed key, never shown ("QUOTATION_SENT")
  leads                 Lead[]
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  @@unique([pipelineId, label])
  @@index([pipelineId, sortOrder])
}

// ---------- Simple masters ----------
model Source {
  id              String   @id @default(cuid())
  name            String   @unique                   // "Instagram Paid Media"
  color           String   @default("#64748B")
  isPaid          Boolean  @default(false)
  isActive        Boolean  @default(true)
  sortOrder       Int      @default(0)
  integrationKeys String[]                           // ["meta:ig:paid", "sheet:Instagram Paid Media Paid Media"]
  leads           Lead[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Product {
  id             String     @id @default(cuid())
  name           String     @unique                  // "Kitchen"
  isActive       Boolean    @default(true)
  sortOrder      Int        @default(0)
  metaAnswerKeys String[]                            // ["elementra_kitchens"]
  leads          Lead[]                              // implicit m2m with Lead.products
  pipelines      Pipeline[] @relation("PipelineAutoProducts")
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
}

model LookupValue {                                  // "Other lists" master
  id        String   @id @default(cuid())
  listKey   String                                   // BUDGET_BAND | POSSESSION_TIMELINE | PROPERTY_TYPE | CONFIGURATION | DESIGNATION
  label     String                                   // "₹6–10 L"
  meta      Json?                                    // {"minInr":600000,"maxInr":1000000} or {"maxMonths":3}
  isActive  Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([listKey, label])
  @@index([listKey, sortOrder])
}

// ---------- Roles & users ----------
enum DataScope {
  OWN
  BRANCH
  ALL
}

model Role {
  id          String    @id @default(cuid())
  name        String    @unique
  description String?
  scope       DataScope
  permissions String[]                               // keys from lib/auth/permissions.ts
  isSystem    Boolean   @default(false)              // seeded; cannot be deleted
  isLocked    Boolean   @default(false)              // Super Admin: permissions/scope immutable
  users       User[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// ---------- Chatbot ----------
enum ChatChannel {
  WHATSAPP
  WEBSITE
  TEST
}

enum ChatStepType {
  MESSAGE        // bot says something, no answer expected
  CHOICE         // one option
  MULTI_CHOICE   // several options ("1,3")
  TEXT
  NAME
  PHONE          // website channel only (WhatsApp already knows the number)
  AREA           // pincode or area text → resolveLocation()
}

enum ChatSessionStatus {
  ACTIVE
  COMPLETED
  HANDED_OFF
  ABANDONED
}

model ChatbotFlow {
  id           String        @id @default(cuid())
  name         String        @unique
  isActive     Boolean       @default(true)
  isDefault    Boolean       @default(false)
  channels     ChatChannel[]
  welcomeEn    String
  welcomeHi    String?
  completionEn String                               // "Thank you {{name}}! {{rep_name}} from {{branch}} will call you."
  completionHi String?
  steps        ChatbotStep[]
  sessions     ChatSession[]
  updatedAt    DateTime      @updatedAt
}

model ChatbotStep {
  id            String       @id @default(cuid())
  flowId        String
  flow          ChatbotFlow  @relation(fields: [flowId], references: [id], onDelete: Cascade)
  key           String                              // "products", "area", "possession"
  sortOrder     Int
  type          ChatStepType
  promptEn      String
  promptHi      String?
  optionsSource String?                             // "PRODUCTS" | "LOOKUP:BUDGET_BAND" | "STATIC"
  staticOptions Json?                               // [{"en":"This week","hi":"इस हफ्ते"}]
  mapsTo        String?                             // lead field key (see §7.3)
  isRequired    Boolean      @default(true)
  isActive      Boolean      @default(true)
  channels      ChatChannel[]                       // empty = all

  @@unique([flowId, key])
}

model ChatSession {
  id             String            @id @default(cuid())
  flowId         String
  flow           ChatbotFlow       @relation(fields: [flowId], references: [id])
  channel        ChatChannel
  externalId     String                             // phone (WhatsApp) or visitor id (website)
  leadId         String?
  language       String            @default("en")
  currentStepKey String?
  answers        Json              @default("{}")
  retries        Int               @default(0)
  status         ChatSessionStatus @default(ACTIVE)
  lastInboundAt  DateTime          @default(now())
  messages       ChatMessage[]
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  @@index([channel, externalId, status])
}

model ChatMessage {
  id        String      @id @default(cuid())
  sessionId String
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  direction String                                  // "IN" | "OUT"
  body      String
  createdAt DateTime    @default(now())

  @@index([sessionId, createdAt])
}

// ---------- Duplicates ----------
model DuplicateDismissal {                           // "not a duplicate" decisions are remembered
  id        String   @id @default(cuid())
  leadAId   String
  leadBId   String
  byId      String
  createdAt DateTime @default(now())

  @@unique([leadAId, leadBId])                       // store with leadAId < leadBId
}
```

**Changes to existing models** (field level; adapt names to what `IMPLEMENTATION_PLAN.md` says exists):

```prisma
// model User {
//   roleId          String                         // replaces role enum
//   role            Role      @relation(fields: [roleId], references: [id])
//   branchId        String?                        // home branch (routing/assignment) — already exists
//   extraBranches   Branch[]  @relation("UserExtraBranches") // managers covering >1 branch
//   reportsToId     String?                        // line manager (display/org chart only)
//   employeeCode    String?   @unique
//   designationId   String?                        // LookupValue(DESIGNATION)
//   mustChangePassword Boolean @default(false)
//   lastLoginAt     DateTime?
//   deactivatedAt   DateTime?
//   (keep: isActive, receivesLeads, onLeave, onLeaveUntil, lastAssignedAt)
// }
// model Branch { extraUsers User[] @relation("UserExtraBranches"); code editable; isActive }
// model Lead {
//   pipelineId         String   → Pipeline        (replaces nothing; new)
//   stageId            String   → PipelineStage   (replaces stage + lostReason enums)
//   sourceId           String   → Source          (replaces source enum)
//   products           Product[]                  (replaces Product[] enum list; implicit m2m)
//   budgetBandId        String?  → LookupValue
//   possessionTimelineId String? → LookupValue
//   propertyTypeId      String?  → LookupValue
//   configurationId     String?  → LookupValue    (1/2/3/4+ BHK)
//   qualificationScore  Int?
//   qualifiedAt         DateTime?
//   qualifiedById       String?
//   priorityIsManual    Boolean  @default(false)
//   mergedIntoId        String?                    // set on the secondary after a merge (hidden from lists)
//   chatSessionId       String?
// }
```

> **Relation naming (Prisma requires it; checked against the validator):**
> - Several relations from `Lead` to `LookupValue` → name each one (`"LeadBudgetBand"`, `"LeadPossession"`, `"LeadPropertyType"`, `"LeadConfiguration"`) and add the back-relation arrays on `LookupValue` (plus `"UserDesignation"` for `User.designation`).
> - `User` now has **two** relations to `Branch` (home + extra) → the existing home-branch relation must be renamed too (e.g., `@relation("UserHomeBranch")` on both sides) next to `"UserExtraBranches"`.
> - `reportsTo` is a self-relation → `@relation("UserReportsTo")` with `reports User[]` on the other side.

---

## 4. Masters (admin screens)

Sidebar group **Masters** (visible with any `masters.*`/`pipelines.manage`/`branches.manage`/`users.*`/`roles.manage` permission): **Pipelines & Statuses · Branches · Sources · Products · Areas & Pincodes · Other lists · Users · Roles**.

### 4.1 Shared master pattern (build once, reuse)

A generic `MasterTable` component + server actions:
- Table: name/label, extra columns, **"Used by N"** count, Active toggle, drag handle for order.
- Search and an "Show inactive" toggle.
- Add/Edit in a side drawer (zod-validated form).
- Row actions: Edit · Deactivate/Activate · **Merge into…** (choose target → moves all references → deactivates source) · Delete (only when Used by = 0).
- Every change goes to `AuditLog` with before/after.
- Dropdowns elsewhere show **active** values only. Records holding an inactive value still display it, greyed with "(inactive)".

### 4.2 Pipelines & Statuses (the "status master")

- Left: the list of pipelines (default star, active toggle, "New pipeline", "Duplicate pipeline").
- Right: the selected pipeline's **stages as draggable rows**: label (inline edit = the "heading"), category (Open / Won / Lost), colour, flags (initial, requires qualification, ask revive date, requires note), stale days, probability, Used by N.
- **Validation (server-side):** exactly one active `isInitial` stage; ≥ 1 active WON stage; ≥ 1 active LOST stage; labels unique within the pipeline; can't delete or deactivate a stage holding leads unless they're merged into another stage first; can't deactivate the default pipeline; exactly one default.
- **Auto-selection:** a pipeline can list `autoProducts`. On intake, the first active pipeline whose autoProducts intersect the lead's products is chosen; otherwise the default. A lead can be moved to another pipeline from its detail page. Stage mapping: the same category and nearest sortOrder, with a confirm dialog.
- **Live effect:** renaming a heading updates kanban columns, stage badges, filters, the lead timeline (historical `STAGE_CHANGE` entries keep the label they had at the time; store the label in `Activity.meta`), reports A–C, dashboard funnel and the stale-days reminder. Grep and remove every hard-coded stage label or enum use.
- **Seed:** pipeline "Sales — Kitchens & Wardrobes" (default) with the client's 14 statuses exactly as in `02_REFERENCE_DATA.md` §1. The lost reasons become LOST-category stages: "10. Closed Lost – Budget", … "14. Closed Lost – Others". On hold and Timeline get `askReviveDate`. "3. Lead Qualified" and every later open stage get `requiresQualification = true`. Stale days come from the old settings.
- **Second seeded pipeline** (to demo the feature): "Turnkey / Full Home" with stages: New enquiry → Site visit & measurement → Design presentation → Proposal sent → Negotiation → Advance received → Won / Lost – Budget / Lost – Competitor / Lost – No response / Lost – On hold. Auto-selected when products include **Full Home Interiors** (a new seeded product).

**Kanban:** a pipeline switcher at the top (remembered per user). Columns = the active OPEN stages in order. The Won / Lost drop zones open a picker of that pipeline's WON/LOST stages (+ revive date when flagged).

### 4.3 Branches

Fields: code, name, kind (Experience Centre / Online Desk), area label, lat/lng (number inputs + a small Leaflet map where clicking sets the pin), service radius (km), assignment strategy, active.
Tabs inside a branch: **Pincode rules** (add/remove pincodes owned by this branch) · **Members** (read-only list → links to Users).
**Live effect:** routing (`decideBranch`) reads active branches from the DB on every call. Adding "Thane Experience Centre" (19.2183, 72.9781, 15 km) must immediately route "Thane West" there in the Routing playground. Deactivating a branch removes it from routing; its open leads stay put and show a "branch inactive" banner with a "Re-route" action.

### 4.4 Sources

Fields: name, colour, paid?, active, **integration keys**, which map incoming data to this source:
- Meta: `meta:ig:paid`, `meta:ig:organic`, `meta:fb:paid`, `meta:fb:organic`
- Sheet/CSV text values: `sheet:<exact text>` (e.g., `sheet:Instagram Paid Media Paid Media` → Instagram Paid Media)
- Website form: `web:form`; chatbot: `chat:website`, `chat:whatsapp`

An intake with no matching key goes to the source flagged as fallback ("Other"), with a warning on the Integrations page ("3 leads arrived with unmapped source 'Exhibition'").
Seed: the client's 10 sources + Website + Other, from `02` §2.

### 4.5 Products

Fields: name, active, order, **Meta answer keys** (`elementra_kitchens`). Seed the 6 from `02` §3 + **Full Home Interiors** (drives the Turnkey pipeline). The chatbot's product question lists active products in order.

### 4.6 Areas & Pincodes (the `Locality` gazetteer)

Admin can add or edit localities (name, city, pincode, lat/lng, aliases) so routing learns new areas without code. Include a "Test" button that runs the resolver on a string, like the Routing playground.

### 4.7 Other lists (`LookupValue`)

Fixed list keys (the code knows the key, the admin owns the values):

| listKey | Seed values | `meta` |
|---|---|---|
| `BUDGET_BAND` | Below ₹3 L · ₹3–6 L · ₹6–10 L · ₹10–20 L · ₹20–35 L · ₹35 L+ | `{minInr, maxInr}` |
| `POSSESSION_TIMELINE` | Ready / already moved in · Within 3 months · 3–6 months · 6–12 months · More than 12 months · Not sure | `{maxMonths}` (null for "Not sure") |
| `PROPERTY_TYPE` | Apartment · Villa / Bungalow · Row house · Office / Commercial | — |
| `CONFIGURATION` | 1 BHK · 2 BHK · 3 BHK · 4 BHK+ · Other | — |
| `DESIGNATION` | Sales Executive · Senior Sales Executive · Branch Manager · Pre-sales Executive · Designer · Site Supervisor · Director | — |

Adding a new list key needs a code change (that's fine). Adding or editing values doesn't.

---

## 5. Users & Roles ("IAM, but simple")

### 5.1 Concepts

- **Role** = a name + **data scope** + a set of **permission checkboxes**. One role per user.
- **Data scope** answers *which records can you see*:
  - `OWN`: leads you own (+ leads you handed over, read-only).
  - `BRANCH`: leads in **your branches** (home branch + extra branches) + leads you own.
  - `ALL`: everything.
- **Permissions** answer *what you can do*. The catalogue lives in code (`lib/auth/permissions.ts`), grouped for the UI:

| Group | Keys |
|---|---|
| Leads | `leads.create`, `leads.edit`, `leads.reassign`, `leads.delete`, `leads.export`, `leads.bulk`, `leads.merge` |
| Pipeline | `pipeline.move`, `pipeline.reopen` (won/lost → open), `pipeline.overrideQualification` |
| Queues | `queues.needsLocation`, `queues.outOfArea`, `queues.duplicates` |
| Insights | `reports.view`, `team.performance` |
| People | `users.view`, `users.manage`, `roles.manage` |
| Masters | `pipelines.manage`, `branches.manage`, `masters.manage` (sources, products, areas, other lists) |
| Admin | `settings.manage`, `automations.manage`, `templates.manage`, `chatbot.manage`, `integrations.manage`, `imports.run`, `audit.view`, `demo.use` |

Viewing leads within scope is implicit; there's no `leads.view` key.

### 5.2 Seeded roles

| Role | Scope | Permissions | Notes |
|---|---|---|---|
| **Super Admin** | ALL | everything | `isSystem`, `isLocked`. Owner. Can't be deleted or reduced. |
| **Branch Manager** | BRANCH | leads.* (no delete), pipeline.*, queues.outOfArea, queues.duplicates, reports.view, team.performance, users.view, users.manage | Manages their branch's executives |
| **Sales Executive** | OWN | leads.create, leads.edit, pipeline.move | Sees only their own leads |
| **Online Desk** | OWN | leads.create, leads.edit, pipeline.move, queues.needsLocation, queues.duplicates | Pre-sales; works the unrouted queue |
| **Management Viewer** | ALL | reports.view, team.performance, users.view, audit.view | Read-only example of a custom role |

Map existing users: OWNER/ADMIN → Super Admin; SALES_MANAGER → Branch Manager; SALES_REP → Sales Executive; PRESALES → Online Desk.

### 5.3 Visibility rules (`lib/auth/scope.ts`, the only place they're defined)

```
leadWhere(user):
  ALL    → {}
  BRANCH → OR[ branchId IN user.branchIds, ownerId = user.id, unroutedClause(user) ]
  OWN    → OR[ ownerId = user.id, handedOverById = user.id (read-only), unroutedClause(user) ]
  always AND mergedIntoId = null (merged secondaries hidden everywhere except their own URL)

unroutedClause(user):
  queues.needsLocation → locationStatus = NEEDS_LOCATION
  queues.outOfArea     → locationStatus = OUT_OF_AREA
  (else nothing)

userWhere(user):           // who you can see in Users, Team, owner pickers, reports
  ALL    → {}
  BRANCH → branchId IN user.branchIds  OR  id = user.id
  OWN    → id = user.id   (owner names on visible leads still render)

user.branchIds = [branchId, ...extraBranches]
```

- Lead detail by URL outside scope returns **404**, not 403, so it doesn't reveal the lead exists.
- Dashboard, reports, kanban, My Day, exports, global search, notifications and CSV export **all** go through `leadWhere` / `userWhere`.
- Reassign targets are limited to users in `userWhere` who have `receivesLeads`.

### 5.4 Anti-escalation guards (server-side)

1. You can only create or edit users **inside your `userWhere`**, and only in your own branches (BRANCH scope).
2. You can only **assign a role whose permissions ⊆ your permissions and whose scope ≤ your scope** (OWN < BRANCH < ALL).
3. You can't change your **own** role, scope or active status.
4. The **last active Super Admin** can't be deactivated or moved to another role.
5. `isSystem` roles can't be deleted. The `isLocked` role's scope and permissions can't be edited.
6. Deleting a role in use is blocked. Reassign its users first.

### 5.5 Session & enforcement

- NextAuth JWT stores `userId` only (plus name/email for display). `getCurrentUser()` (wrapped in React `cache()`) loads user + role + permissions + branchIds from the DB once per request.
- If the user is inactive → sign out and redirect to `/login?reason=deactivated`.
- `requirePermission(key)` and `can(user, key)` are used in **every** server action and route handler.
- On successful login set `lastLoginAt`. If `mustChangePassword` → redirect to `/account/password`.

### 5.6 Screens

- **Users** (Masters): table (name, employee code, designation, role, home branch + extra branches, reports to, receives leads, on leave, last login, status). Filters by branch/role/status. Drawer: create/edit, **Set temporary password** (sets `mustChangePassword`), **Deactivate**.
  - Deactivating opens a dialog: "Arjun has 14 open leads and 6 open tasks → reassign to: [user] / Auto-distribute in Andheri (round-robin)". It then reassigns, audits and deactivates.
- **Roles** (Masters): role cards (name, scope, # users, # permissions, system/locked badges). Editor: name, description, **scope radio** with a plain-English hint ("Sees only leads they own"), **permission checkboxes grouped as in §5.1**, each with a one-line description. "Clone role" button. A **"Preview as…"** panel: pick a user → "This user can see 312 leads in Worli and Andheri, 8 users, and can: …".
- **Team performance** (Insights; `team.performance`): one row per manager/branch, expandable to executives. Columns: open leads, new this week, first-contact within SLA %, overdue follow-ups, visits booked, won (count, ₹), last login, actions today. The Super Admin sees every branch; a Branch Manager sees theirs. Clicking a person opens their activity (audit filtered by actor + their tasks).
- **Account** (`/account`): change own password, see own role & permissions (read-only).

### 5.7 Seed users

Keep the users from `02_REFERENCE_DATA.md` §5, mapped to the new roles. Add a **Regional Manager — Mumbai** demo user ("Vikram Sethi", vikram@elementra.test) with role Branch Manager, home branch Worli, extra branches Andheri + Tardeo. This shows multi-branch visibility.

---

## 6. Lead qualification logic

### 6.1 Criteria (configurable weights in Settings → Qualification)

| Key | Criterion | Default weight | Required for "Qualified" |
|---|---|---|---|
| `location` | Site location resolved and **in service area** | 25 | ✅ |
| `products` | At least one product selected | 15 | ✅ |
| `contacted` | Reached the customer: a CONNECTED call, a WhatsApp reply, or a completed chatbot conversation | 15 | ✅ |
| `possession` | Possession timeline known | 15 | — |
| `budget` | Budget band known **and** ≥ minimum band (setting, default "₹3–6 L") | 15 | — |
| `property` | Property type or configuration known | 5 | — |
| `influencer` | Architect / decision-maker known | 10 | — |

Score = sum of the weights met (0–100). It is recomputed on every lead save, activity, chatbot completion or stage change by a pure function `scoreLead(lead, settings) → {score, met[], missing[], suggestedPriority, disqualifiers[]}`.

### 6.2 Priority & disqualifiers

- Auto-priority (unless `priorityIsManual`): **HOT** if score ≥ 75 and possession `maxMonths` ≤ 3; **WARM** if score ≥ 45; else **COLD**.
- Disqualifier **suggestions** (never automatic): out of area → suggest the "Closed Lost – Others" stage with note "Out of service area"; budget band below the minimum → suggest "Closed Lost – Budget".

### 6.3 The gate

Moving a lead into any stage with `requiresQualification = true` (drag, dropdown, bulk) is **blocked** unless all required criteria are met. The response lists what's missing: "Can't move to 3. Lead Qualified — missing: site location, contact reached." Users with `pipeline.overrideQualification` see an "Override with reason" option (audited).

### 6.4 UI

- A **Qualification card** on the lead detail: score ring, ✓/✗ checklist with inline quick-edit (budget band, possession, property type, BHK dropdowns from Other lists), a "Mark qualified" button (moves to the pipeline's first `requiresQualification` stage), and disqualifier suggestions.
- Leads list: score column + filter "Qualified / Not yet".
- Settings → **Qualification**: weights, required toggles, minimum budget band, HOT/WARM thresholds.
- The demo seed recomputes scores for all leads.

---

## 7. Duplicate handling

### 7.1 Detection (`lib/domain/leads/duplicates.ts`, pure + query)

Match keys, in order of strength:
1. same normalised **phone** (primary or alt, either side);
2. same **email** (lowercased, trimmed);
3. (weak, flag only) same first name + same locality within 30 days.

Only compare against leads with `mergedIntoId = null`, not in a dismissed pair, created within `duplicates.windowDays` (default 180).

### 7.2 Policies (Settings → Duplicates)

| Situation | Setting | Options (default **bold**) |
|---|---|---|
| Automatic intake (Meta, chatbot, website, CSV) finds an **open** lead | `duplicates.intakePolicy` | **Link to existing owner** (current behaviour: new lead linked, same owner/branch, owner notified) · Merge into existing (add an activity "New enquiry via Instagram" to the existing lead, no new lead) · Create and flag |
| Intake finds only **closed** leads | — | Always route normally + "Returning customer" chip |
| **Manual** create finds a match | `duplicates.manualPolicy` | **Warn** (dialog: Open existing / Create linked enquiry / Cancel) · Block |

The manual create form runs the check **live** when the phone or email field loses focus, and shows the matching lead's ref, owner, branch and stage. Matches outside the user's scope show as "Exists in another branch — your manager has been notified" without revealing details, and the owner and branch manager get a notification.

### 7.3 Possible duplicates queue (`queues.duplicates`)

Queues → **Possible duplicates**: side-by-side pairs (match reason, both leads' key fields).
- **Merge**: choose the primary. Move activities, tasks, appointments, messages, chat sessions and routing decisions to the primary. Union the products. Keep the primary's owner/stage unless the user picks otherwise. Fill empty primary fields from the secondary. Set `mergedIntoId` on the secondary and hide it everywhere. Add timeline entries on both. Audit. All in one transaction.
- **Not a duplicate**: store a `DuplicateDismissal`; the pair never shows again.
- **Link as returning enquiry**: set `duplicateOfId`.

A nightly scan (part of the reminder engine, rule **R10**, idempotent) surfaces pairs created by imports or edits.

### 7.4 Tests

Phone variants (`+91…`, `91…`, alt phone), email case, dismissed pairs never resurface, merge moves every child record and is idempotent, scope-limited users can't merge leads outside their scope.

---

## 8. Chatbot flow (WhatsApp + website)

> **Assumption, confirm with the client:** "chatbot flow" means a **rule-based qualification bot**. It greets the enquirer, asks the questions the Online Desk asks today (product, site area, possession, budget, visit preference), creates or updates the lead, routes it, and hands over to a human. **No AI/LLM** in this milestone (AI bots were excluded from the proposal). It runs on **WhatsApp** (simulator until Meta approves; same engine later) and as a **website chat widget** (fully live on staging, no Meta needed).

### 8.1 Engine (`lib/domain/chatbot/engine.ts`, pure)

```
nextTurn(flow, session, inbound: string | null, ctx) →
  { replies: string[], patch: {answers, currentStepKey, language, retries, status},
    leadPatch?: Partial<IngestInput & QualificationFields>, done: boolean, handoff: boolean }
```

- `inbound = null` starts the session: welcome (EN) + language choice "1. English 2. हिंदी". Typing "hindi"/"हिंदी"/"2" sets `language = hi` at any point.
- **Answer parsing:** CHOICE accepts the option number, the exact label, or a fuzzy label (Jaro-Winkler ≥ 0.88). MULTI_CHOICE accepts "1,3", "1 3" or "kitchen and wardrobes". AREA calls `resolveLocation()` (pincode → alias → fuzzy). If unresolved, ask once more with an example ("e.g., 400053 or Andheri West"); if still unresolved, keep the raw text and continue (the lead will go to Needs-location). PHONE runs `normalisePhone()`. NAME title-cases.
- Invalid answer → re-ask with the options listed, max 2 retries, then accept "skip" for optional steps or hand off for required ones.
- **Keywords at any time:** "agent", "human", "call me", "baat karni hai", "talk" → hand off. "stop" → end + opt-out flag on the lead (no more automated messages).
- **Out of area** (AREA step resolves OUT_OF_AREA): send the `out_of_area_regret` text, mark the session COMPLETED, still create the lead (it lands in the Out-of-area queue).
- **On completion or handoff** (orchestrator `lib/domain/chatbot/run.ts`, not pure): build the IngestInput (channel `WHATSAPP` or a new `WEBSITE_CHAT` value in `IntakeChannel`; source from the integration key `chat:whatsapp` / `chat:website`), call `ingestLead()` (dedupe applies; for an existing open lead, update the fields instead), set the qualification fields, recompute the score, mark `contacted` met, and reply with the completion text filled in with `{{name}}`, `{{rep_name}}`, `{{branch}}`. If there's a visit preference, create a FOLLOW_UP task for the owner: "Customer wants a showroom visit **this week** — call to book".
- **Human takeover:** when a staff member sends a manual message in the Inbox, the session becomes HANDED_OFF and the bot stays silent.
- **Expiry:** sessions inactive > 24 h → ABANDONED. If they had reached the AREA step, still create the lead with what's known. This runs in the reminder engine (rule **R11**, idempotent). One nudge after 30 min of silence on an ACTIVE session ("Still there? Reply 1 to continue").

### 8.2 Default flow (seeded, editable)

| # | key | type | Prompt (EN) | Prompt (HI) | mapsTo |
|---|---|---|---|---|---|
| 0 | welcome | MESSAGE | Hi! 👋 Welcome to Elementra — bespoke kitchens, wardrobes & interiors. I'll ask 5 quick questions so the right Experience Centre can help you. | नमस्ते! 👋 Elementra में आपका स्वागत है। 5 छोटे सवाल पूछूँगा ताकि सही एक्सपीरियंस सेंटर आपकी मदद कर सके। | — |
| 1 | name | NAME | May I know your name? | आपका नाम क्या है? | firstName/lastName |
| 2 | phone | PHONE *(website only)* | Your mobile number, so our team can call you? | आपका मोबाइल नंबर? | phone |
| 3 | products | MULTI_CHOICE (PRODUCTS) | What are you looking for? Reply with numbers, e.g., 1,2 | आप क्या बनवाना चाहते हैं? नंबर लिखें, जैसे 1,2 | products |
| 4 | area | AREA | Where is your site? Share the pincode or area (e.g., 400053 or Andheri West). | आपकी साइट कहाँ है? पिनकोड या एरिया बताएं (जैसे 400053 या अंधेरी वेस्ट)। | siteAddress/pincode |
| 5 | possession | CHOICE (LOOKUP:POSSESSION_TIMELINE) | When do you get possession / plan to start? | पज़ेशन कब मिलेगा / काम कब शुरू करना है? | possessionTimelineId |
| 6 | budget | CHOICE (LOOKUP:BUDGET_BAND), optional | Roughly what budget do you have in mind? (Reply "skip" if not sure) | लगभग बजट कितना है? (पता न हो तो "skip" लिखें) | budgetBandId |
| 7 | visit | CHOICE (STATIC: This week / Next week / Just call me) | Would you like to visit our {{branch}} Experience Centre? | क्या आप हमारे {{branch}} एक्सपीरियंस सेंटर आना चाहेंगे? | visitPreference → task |

Completion (EN): "Thank you {{name}}! {{rep_name}} from our {{branch}} Experience Centre will call you shortly. You can share your floor plan here anytime." (HI equivalent seeded.)
`{{branch}}` in step 7 uses the routing decision computed right after step 4 (dry run). If out of area, step 7 is skipped.

### 8.3 Channels

- **Website widget** (LIVE on staging): `/chat` is a standalone mobile-first chat page (brand header, bubbles, quick-reply buttons for CHOICE options). Add a floating "Chat with us" button on `/enquire`, plus an embeddable snippet (`<iframe src=".../chat">`) documented on the Integrations page. API: `POST /api/public/chat` (start / message), with a visitor id cookie. **Abuse protection:** honeypot field, simple per-IP rate limit (DB- or memory-based; 30 messages per 10 min), max message length 500, and no HTML rendering of user input.
- **WhatsApp** (SIMULATED): in the Inbox, "Simulate customer message" from a phone number runs through the engine and the replies appear as bot bubbles. The future Meta inbound webhook calls the same `handleInbound(channel, externalId, text)`.
- **Test console** (Admin → Chatbot): a phone-mock chat with "Reset", language toggle and a "Create real lead" checkbox (off by default → TEST channel, no lead created; on → full ingest so the demo shows routing).

### 8.4 Admin → Chatbot screen (`chatbot.manage`)

Tabs: **Flow** (steps as draggable cards: prompt EN/HI, type, options source, required, active, channels; live phone-mock preview) · **Test console** · **Conversations** (sessions list: channel, number/visitor, status, step reached, linked lead, started; click for the transcript) · **Settings** (enable per channel, nudge minutes, expiry hours, handoff keywords).

### 8.5 Tests (pure engine)

Happy path EN and HI; numeric, label and fuzzy answers; multi-choice parsing; AREA with a misspelt area (→ resolved) and Surat (→ out of area, regret, lead still created); "skip" on an optional step; retries then handoff; "agent" keyword; "stop" opt-out; session resume after reload; website PHONE step validation.

---

## 9. "Ready on staging"

- Make the app deployable on **Vercel + Neon**, then write `STAGING.md`:
  - Env vars (all from `.env.example` + `DIRECT_URL` if using Neon pooled connections: add `directUrl = env("DIRECT_URL")` to the datasource for migrations; check what the repo already does).
  - Migrations: `npx prisma migrate deploy` against staging (document the command; optionally the Vercel build command `prisma generate && prisma migrate deploy && next build`, and say which one was chosen).
  - Seed: `npm run db:seed` (+ `db:seed:demo` for UAT data). Staging keeps `DEMO_MODE=true`, but the demo panel requires the `demo.use` permission (Super Admin only).
  - Cron: Hobby = once a day (`vercel.json`). Note the external-pinger option for minute-level reminders.
  - Smoke-test checklist (§11 script steps 1–12 on the staging URL).
- If the `vercel` CLI is installed and logged in on this machine, you may deploy a preview yourself. **Never** create Vercel/Neon accounts or paste secrets into files. Otherwise stop at a deploy-ready state and leave the steps in `STAGING.md` for Rana.

---

## 10. Changes elsewhere

- `lib/features.ts` + Build Status page: group by the **4 contract milestones** (§0). Add features: Masters (each), Roles & permissions, Team performance, Qualification, Duplicates queue + merge, Chatbot (website: LIVE; WhatsApp: SIMULATED), Staging. Use honest statuses.
- Demo panel scenarios still work (routing is unaffected). Update any scenario relying on enum values. Add scenario **"Chatbot — WhatsApp enquiry"** that runs the default flow with scripted answers (Kitchen + Wardrobes, "goregoan east", Within 3 months, ₹6–10 L, This week) → lead in Andheri, HOT/WARM by score.
- Reports A–C, dashboard funnel, lost-reasons chart: driven by stage master (category + label + order), per pipeline (pipeline filter; default pipeline preselected).
- Reminder engine: R1 uses `isInitial`; R3 uses `stage.staleDays`/`staleTaskType`; new **R10** (duplicate scan, nightly) and **R11** (chat nudge/expiry).
- Update `STATUS.md`, `CLAUDE.md` project facts, and `IMPLEMENTATION_PLAN.md` (new "Week 2" section).

---

## 11. Week 2 acceptance script (definition of done)

Run on a fresh `npm run db:reset` with `npm run dev:all`, then repeat steps 1, 7 and 10 on staging if deployed.

1. **Super Admin → Masters → Pipelines & Statuses:** rename "3. Lead Qualified" to "3. Qualified – Ready for visit". The kanban column, lead badges, filters and Report A show the new heading after refresh. Drag "5. Quotation Requested" above "4. Discovery…" and back.
2. Add a stage "6a. Revised Quotation Sent" (OPEN, stale 3 days) → it appears as a kanban column.
3. Try to deactivate a stage holding leads → blocked with "Merge leads into…". Merge into another stage → the counts move.
4. **New pipeline:** open "Turnkey / Full Home" in the kanban switcher. Demo panel → simulate a lead with product **Full Home Interiors** → it lands in Turnkey, initial stage.
5. **Sources:** add "Housing.com" → it appears in the new-lead dropdown, leads filter and Report sources; deactivate → gone from the dropdown, old leads still show it greyed.
6. **Branches:** add "Thane Experience Centre" (19.2183, 72.9781, radius 15 km) → Routing playground "Thane West" → Thane branch. Deactivate it → back to Andheri.
7. **Roles & users:** clone Branch Manager → "Regional Manager". Log in as **Worli manager**: only Worli leads, Worli users, Worli numbers; a Pune lead URL → 404; can't assign Super Admin to anyone. Log in as **Vikram (Regional, Worli + Andheri + Tardeo)**: sees those three branches only. Log in as **Andheri executive**: only own leads; can't open a colleague's lead. **Super Admin → Team performance**: every branch and manager.
8. As Super Admin, remove `leads.export` from Sales Executive → the executive's Export button disappears on their next page load (no re-login).
9. **Deactivate** an executive with open leads → reassign dialog → leads move → that user's session is rejected on the next request.
10. **Qualification:** open a NEW lead → drag to "3. Qualified…" → blocked, missing items listed → set budget + possession, log a CONNECTED call → score updates, priority suggests → move succeeds.
11. **Duplicates:** New lead with an existing phone → warning dialog showing the existing lead → "Create linked enquiry". Queues → Possible duplicates → Merge → one lead with the combined timeline. "Not a duplicate" on another pair → it doesn't come back after "Run reminders now".
12. **Chatbot:** Admin → Chatbot → Test console ("Create real lead" on), in Hindi: products "1,2" → area "goregoan east" → Within 3 months → ₹6–10 L → This week → completion message names the Andheri rep. The lead exists with source "Chat – Website/Test", fields filled, score shown, and a "visit this week" task. Then `/chat` on a phone-width viewport: same flow in English with the phone step. Inbox → "Simulate customer message" → the WhatsApp flow works, and a manual reply hands off (bot goes silent).
13. Build Status shows the 4 contract milestones, End of Week 2 items marked honestly.
14. `npm run lint`, `typecheck`, `test`, `build` all pass. Tests cover: scope (Worli ≠ Pune, executive ≠ colleague, 404 on out-of-scope URL), anti-escalation (role ⊆ own permissions, last Super Admin), stage-master validation, pipeline auto-selection, qualification scoring and gate, duplicate detection and merge, chatbot engine paths (§8.5).

---

## 12. Out of scope for Week 2

Per-record sharing, deny rules, approval workflows, field-level permissions, SSO/2FA, password-reset emails (admin sets temporary passwords), multi-tenant, AI/LLM chatbot, real WhatsApp/Meta sending (End of Week 5), custom fields builder (future: "Lead fields master"), drag-and-drop flow builder with branching (the flow is a linear list with optional skips).
