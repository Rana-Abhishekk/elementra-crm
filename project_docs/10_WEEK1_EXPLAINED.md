# Elementra CRM — Week 1 Explained (what was built, how it works, what's left)

> **Audience:** you (project lead) and anyone joining the project. Plain language first, technical detail after.
> **Companion docs:** test it with `08_WEEK1_TEST_GUIDE.md`, present it with `09_WEEK1_DEMO_GUIDE.md`, decisions log in `IMPLEMENTATION_PLAN.md` (sections W.1–W.10), live status in `STATUS.md` / the Build Status page.

---

## 1. Are we done? — the short answer

**Week 1 ("CRM Foundation") is done, except the staging link**, which only needs Vercel + Neon access (the app is deploy-ready; `STAGING.md` has the steps).

The project as a whole (5 weeks) is **not** finished: Week 2 (qualification, duplicates review screen, chatbot) is next; Weeks 3–5 parts depend on the client's accounts (Meta, WhatsApp, Google) and UAT.

Legend: ✅ Done (live, tested) · 🟡 Partly done / simulated · ⏳ Not started / waiting · 🔒 Waiting on client access

### 1.1 Week 1 — CRM Foundation (the milestone due now)

| Deliverable (client timeline) | Status | What exists |
|---|---|---|
| Setup server / database | ✅ | Next.js 16 app, PostgreSQL (Docker locally), migrations that apply on an empty DB and on existing data |
| Secure authentication | ✅ | Email + password (hashed), session holds only the user id, deactivated users thrown out on the next click, temporary passwords with forced change, "My account" page |
| Role permissions | ✅ | Roles = data scope (Own / Branch / All) + 29 permission checkboxes; 5 built-in roles; create / clone / delete roles; Preview as…; anti-escalation rules |
| Branch-based segregation | ✅ | Worli ≠ Pune, executives ≠ colleagues, regional managers over several branches, Super Admin sees all; out-of-scope links answer "not found" |
| User management | ✅ | Create / edit / temp password / deactivate with hand-over / reactivate; home + extra branches; reports-to; last sign-in |
| Super Admin instead of Owner | ✅ | Owner and Admin became **Super Admin** (locked role; can't be deleted or reduced) |
| Status / pipeline master | ✅ | Rename, reorder, add columns, colours, Won/Lost, revive date, stale-day nudges, merge-instead-of-delete; multiple pipelines; auto-pipeline by product |
| Source master | ✅ | Add / order / colour / paid / integration keys / deactivate / merge; unmapped values flagged |
| Product master | ✅ | Add / order / Meta answer keys / deactivate / merge; used everywhere incl. website form |
| Branch master | ✅ | Add / edit with map pin, radius, assignment style, pincode rules; routing follows instantly |
| Phone number as customer key (no duplicates) | ✅ | One contact per phone; one open lead per phone (enforced by the database) |
| Team performance ("super user sees every manager") | ✅ | Per branch and person |
| Core CRM modules | ✅ | Leads, lead detail, kanban, My Day, appointments, queues, contacts/companies/deals, dashboard, reports, audit log (built earlier, now running on the masters) |
| Staging link for review | 🔒 | Deploy-ready; needs Vercel + Neon accounts. See `STAGING.md` |

### 1.2 Week 2 — Lead Logic & Chatbot (next)

| Deliverable | Status | Notes |
|---|---|---|
| Duplicate handling | 🟡 | **Done:** detection by phone, automatic "add to existing lead", block on the manual form, returning-customer flag. **Left:** email matching, "Possible duplicates" review queue with Merge / Not a duplicate, nightly scan (R10) |
| Qualification tracking | 🟡 | **Done:** stages carry the "needs qualification" flag. **Left:** score (0–100), auto Hot/Warm/Cold, the gate that blocks moving unqualified leads, Qualification card, budget / possession / property-type fields |
| Auto-assignment | ✅ | Round-robin / fewest open leads, skips people on leave (built earlier) |
| Service-area logic | ✅ | Pincode rules, ~90-locality map, spelling-tolerant matching, out-of-area queue (built earlier) |
| Chatbot flow with test leads | ⏳ | Rule-based website + WhatsApp bot, test console, conversations |
| Areas & Pincodes master, Other lists master | ⏳ | Come with qualification |

### 1.3 Weeks 3–5

| Week | Deliverable | Status |
|---|---|---|
| 3 | Website chatbot | ⏳ (Week 2 build) |
| 3 | WhatsApp Business API | 🔒 simulator works; real sending needs Meta approval |
| 3 | Meta Lead Forms | 🔒 webhook + CSV import built (simulated); needs Meta Business access |
| 3 | Google Sheets sync | 🔒 mapper ready; needs sheet access |
| 3 | Google Maps API | 🔒 provider coded, switched off; needs API key |
| 4 | Follow-up reminders | ✅ 9 rules (R1–R9), Automations screen, Run now |
| 4 | Stage actions | ✅ connected call → Contacted, visit → Discovery, revive dates, won → deal + project |
| 4 | Management dashboards | ✅ dashboard, 3 report pivots, campaigns, team performance |
| 4 | Error handling / end-to-end testing | 🟡 201 automated tests + scenario and acceptance scripts; full UAT pending |
| 5 | Initial data import (their current sheet) | 🟡 column-mapping preview; cleaning rules to agree |
| 5 | UAT, training, production deploy, handover | ⏳ |

---

## 2. What changed, in plain words

### 2.1 "Masters" — the admin's lists
A *master* is a list the admin maintains that appears in dropdowns across the app (standard Indian ERP vocabulary). Before Week 1, stages, sources, products and roles were fixed in the code. Now they are **rows in the database with an admin screen**. Rename "3. Lead Qualified" once and every screen — kanban, badges, filters, reports, dashboard, reminders — shows the new name on the next click.

**Rule:** something in use is never deleted. You **deactivate** it (hidden from dropdowns, old records still show it greyed) or **merge** it into another value (its records move over).

### 2.2 Stages are columns
Each pipeline has stages of three kinds: **Open**, **Won**, **Lost**. The client's lost reasons (Budget, Competitor, Timeline, No response, On hold, Others) are now Lost stages of their own, so the client sees exactly the 14 statuses from their sheet (15 rows because two are numbered "10."). Flags on a stage drive behaviour: *starting stage*, *needs qualification*, *ask for a revive date*, *note required*, *nudge after N idle days*.

A second pipeline, **Turnkey / Full Home**, shows that different kinds of work can follow different stages; leads with the *Full Home Interiors* product start there automatically.

### 2.3 Roles = "what you see" + "what you can do"
- **See (data scope):** **Own** (only my leads), **Branch** (my branches' leads and people), **All**.
- **Do (permissions):** checkboxes like *Create leads*, *Reassign leads*, *Export*, *Manage users*, *Pipelines & statuses*…

Built-in roles:

| Role | Sees | Can do |
|---|---|---|
| **Super Admin** (locked) | All | Everything |
| **Branch Manager** | Branch (home + extra branches) | Leads (create/edit/reassign/export/bulk/merge), move & reopen stages, out-of-area queue, reports, team performance, view & manage users in their branches |
| **Sales Executive** | Own | Create/edit leads, export, move stages |
| **Online Desk** | Own + needs-location queue | Create/edit leads, move stages, needs-location queue, imports |
| **Management Viewer** | All | Read-only: reports, team performance, users, audit |

Safety rules: you can only give someone a role that sees and does no more than you; you can't change your own role or switch yourself off; the last Super Admin can't be removed; built-in roles can't be deleted; a role with users can't be deleted.

### 2.4 Branch segregation
Each user has a **home branch** (where new leads are assigned to them) and optional **extra branches** (for managers covering several). Vikram Sethi (demo) manages Worli + Andheri + Tardeo. A Branch Manager sees leads and people of those branches only. If someone opens a link to a lead outside their scope, the app answers **"not found"** — it doesn't even confirm the lead exists.

### 2.5 Changes apply immediately
The login cookie only says *who you are*. Your role, permissions and branches are read fresh on every request. So when the admin changes a role, removes a permission or deactivates someone, it takes effect **on that person's next click** — no sign-out needed. A deactivated person is sent to the login page.

### 2.6 Phone number = the customer's key
The client asked to "use the phone number as the primary key so there are no duplicate entries". We implemented the guarantee, not the literal database key:

- Phone numbers are normalised (`9000012345`, `+91 90000 12345`, `91-90000-12345` are the same).
- **One customer record per phone number** — the database refuses a second one.
- **One open lead per phone number** — the database refuses a second open lead.
- A new Meta / website / CSV enquiry from a number that already has an open lead is **added to that lead** (timeline "New enquiry via…", owner notified).
- Someone typing that number on the New lead form is **sent to the existing lead**; if it belongs to another branch they're told it exists (no details) and its owner + manager are notified.
- A customer whose earlier lead is closed (won or lost) gets a **new lead marked "Returning customer"**, linked to the old one.

Why not make the phone the literal primary key? Customers change numbers (every link would break), it would put phone numbers in every web address and log (privacy), some leads arrive with only an email, and a past customer must be able to come back. The unique keys give the same "no duplicates" guarantee without those problems.

### 2.7 Audit
Every admin change is recorded with who, when and **before → after**: stage renamed, source merged, user created / role changed / deactivated (with the list of reassigned leads), role permissions added/removed, pipeline created.

---

## 3. How it works (technical)

### 3.1 Code map (new or changed)

| Path | What |
|---|---|
| `prisma/schema.prisma` | New tables `Pipeline`, `PipelineStage`, `Source`, `Product`, `Role`; `Lead.pipelineId/stageId/sourceId/products`, `Lead.openPhoneKey` (unique), `Contact.phoneE164` (unique); `User.roleId`, extra branches, reports-to, employee code, designation, temp-password flag, last login, deactivated at |
| `prisma/migrations/20261030090000_week1_masters_rbac` | Hand-ordered migration that **maps existing data** (old enums → new rows with fixed ids) |
| `lib/domain/masters/defaults.ts` | Seed values: the 2 pipelines, 12 sources, 7 products, 5 roles |
| `lib/auth/options.ts` | NextAuth config; JWT = id only; sets last login |
| `lib/auth/current-user.ts` | `getCurrentUser()` — user + role + permissions + branches, once per request (React `cache`) |
| `lib/auth/scope.ts` | **The only visibility rules:** `leadWhere()`, `userWhere()`, `canSeeLead()`, `canEditLead()`, manager / Super Admin lookups |
| `lib/auth/guards.ts` | `can()`, `requirePermission()`, `requirePagePermission()` |
| `lib/auth/permissions.ts` | The 29-permission catalogue with labels and hints |
| `lib/auth/escalation.ts` | Anti-escalation rules (pure functions, unit-tested) |
| `lib/auth/coverage.test.ts` | Fails if any server action or API route lacks a permission/auth check |
| `lib/domain/stages.ts` | Pure stage helpers: allowed moves, validation, pipeline auto-selection, legacy-status matching, `openPhoneKey()` |
| `lib/domain/masters/resolve.ts` | Maps incoming values (Meta keys, sheet text, names) to sources/products |
| `lib/data/masters.ts` | Loads masters from the DB |
| `app/dashboard/masters/**` | Admin screens + server actions (pipelines, sources, products, branches, users, roles) |
| `app/dashboard/team-performance`, `app/dashboard/account`, `app/account/password` | New pages |

### 3.2 Rules the code follows
1. **No business labels in code.** Code uses a stage's *category* (Open/Won/Lost), *flags* or a stable hidden `systemKey` (for optional automations like "connected call → Contacted"; if the admin removes that stage, the automation simply doesn't fire). Only seed files name the seeded rows.
2. **Security is server-side.** Every server action / API route checks a permission and filters by scope. Hiding buttons is only convenience.
3. **Nothing in use is hard-deleted.**
4. **Every automatic decision writes a timeline line; every admin change writes an audit row.**

### 3.3 How the duplicate guarantee is enforced
`Lead.openPhoneKey` holds the normalised phone while the lead is open and becomes empty when it's Won/Lost. The database has a unique index on it, so two open leads with the same number are impossible — even if two Meta webhooks arrive at the same second (the second one is retried as a repeat enquiry). Every code path that opens/closes a lead or edits its phone keeps the key in sync.

### 3.4 What was verified
- `npm run lint`, `typecheck`, `test` (201 tests), `build` — all pass.
- `npm run demo:check` (11 scenarios) and `npm run demo:acceptance` (13 steps) — pass.
- Migration: applied to a copy of the existing data (every stage / source / role count identical), to an empty database, and checked for drift.
- Over real HTTP sessions on a production build: the visibility matrix (Super Admin / Worli Manager / Vikram / Andheri Exec), admin pages per permission, live permission removal, deactivated-user rejection, stage rename on every screen, adding a stage and a source through the UI.

---

## 4. Decisions you should know about

| Decision | Why |
|---|---|
| Phone is a unique key, not the primary key | See 2.6 |
| Repeat automatic enquiries are added to the open lead; the manual form refuses | No duplicates, nothing lost, owner informed |
| Lost reasons became stages ("10. Closed Lost – Budget"…) | Matches the client's 14 statuses; admin can add more |
| Owner + Admin merged into Super Admin | Client asked for Super Admin; one locked all-powerful role |
| Stage reordering with ↑/↓ arrows (not drag) | Works on phones, no extra library |
| Stage merge only within the same kind (Open→Open, Lost→Lost) | Can't accidentally close or reopen leads |
| Online Desk keeps Imports; Sales Executive keeps Export | Preserves existing behaviour; admin can untick |
| Designation is free text for now | The "Other lists" master comes in Week 2 |
| Build Status follows the client's 5-week timeline | What the client sees in their proposal |
| Migrations run from a machine, not during the Vercel build | A failed build can't half-migrate staging |

---

## 5. Known limits and rough edges

- **Staging link not published** — needs Vercel + Neon access (`STAGING.md`).
- **Contacts page** (older screen): adding a contact with a phone that already exists shows a generic error page (nothing is saved).
- Delete / duplicate buttons use the browser's built-in "Are you sure?" box.
- Reorder is by arrows; a new open stage is added after the last open stage and moved up by hand.
- On the Vercel Hobby plan, the reminder engine runs once a day (minute-level needs Pro or an external pinger).
- Real WhatsApp / Meta / Google calls are simulated until the client's accounts are connected.
- If you upgraded an old local setup: restart `npm run dev` after migrating (an old dev server keeps the old database client in memory).

---

## 6. What's next (Week 2 plan, from `06_WEEK2_SPEC…`)

1. **Qualification:** budget band / possession / property type / BHK fields (Other lists master), score 0–100, auto Hot/Warm/Cold, the qualification gate with "override with reason", Qualification card, settings.
2. **Duplicates review:** email matching, Possible duplicates queue, Merge / Not a duplicate / Link, nightly scan.
3. **Chatbot:** rule-based EN/HI flow, website widget at `/chat`, WhatsApp via the inbox simulator, test console, conversations, human takeover.
4. **Areas & Pincodes master.**
5. **Staging** live once access arrives; run the Week 1 smoke test there.
