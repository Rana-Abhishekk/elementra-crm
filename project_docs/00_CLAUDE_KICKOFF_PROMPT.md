# Kickoff prompt for Claude Code

> Paste everything inside the box below into Claude Code, opened at the repo root (`elementra-crm/`), with the `project_docs/` folder already in the repo.

---

```text
You are the lead engineer on "Elementra CRM", a lead-management CRM for a premium modular-kitchen
brand with Experience Centres in Worli, Andheri, Tardeo (Mumbai) and Pune. Leads come mostly from
Instagram/Facebook lead ads. The system must route every lead to the right branch team by site
location, assign it to a person (skipping people on leave), catch out-of-area and no-location leads,
and run server-side follow-up reminders and escalations so leads stop dying as "No response".

GOAL OF THIS WORK: a polished, honest, clickable DEMO for the client on the REAL codebase. The core
flow (intake → routing → assignment → follow-ups → pipeline → dashboard) must truly work end to end.
Everything else in the scope gets a finished-looking screen with a clear status badge
(Simulator / Preview / In progress / Planned add-on). Breadth matters, but do not over-engineer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. READ FIRST (in this order, fully)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. CLAUDE.md and AGENTS.md at the repo root (follow them; AGENTS.md may tell you to consult the
     Next.js docs bundled in node_modules/next/dist/docs/ — do that for proxy.ts, async params,
     caching/revalidation, because Next.js 16 differs from older versions).
  2. project_docs/01_PRODUCT_AND_DEMO_SPEC.md   ← the build spec (source of truth)
  3. project_docs/02_REFERENCE_DATA.md           ← enums, seed data, templates, scenarios, gazetteer
  4. project_docs/03_CLIENT_PITCH_AND_DEMO_SCRIPT.md → only Part C (demo talk track) and Part D
     (status board). The demo you build must support that script exactly.
  (project_docs/04_UNDERSTANDING_THE_PROJECT.md is for the human; skim §3 and §7 for context.)

Then inspect the existing code: package.json, prisma/schema.prisma, prisma/seed.ts, proxy.ts,
next.config.ts, vercel.json, app/ (especially app/(auth)/login and app/dashboard with the existing
Overview/Contacts/Companies/Deals), lib/, components/, types/.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. STACK (already in the repo — do NOT change it)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next.js 16 App Router (Server Components for reads, Server Actions for mutations, Route Handlers for
webhooks/public/cron/export/polling, proxy.ts for route protection), React 19, TypeScript strict,
Prisma 6 + PostgreSQL (Docker locally, Neon in production), NextAuth v4 Credentials + JWT sessions,
Tailwind CSS 4, deployed on Vercel (sin1).
Allowed new packages are listed in spec §4 — add only what you need; reuse anything already present
(UI kit, icons, toasts, validation). No new frameworks, no extra infra (no Redis/queues/websockets/
microservices/PostGIS/Google Maps JS SDK). Extend existing Prisma models; never duplicate User,
Contact, Company or Deal.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. HARD RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • PORTS: never use 3000 or 5432 (other projects run there).
      Next.js dev/start → 4610   ("next dev -p 4610", "next start -p 4610")
      Postgres (Docker)  → host 5610 → container 5432 (docker-compose.yml in spec §5)
      Prisma Studio      → 5611
      NEXTAUTH_URL       → http://localhost:4610
  • DATA: all seed/demo/test data is synthetic (spec + 02_REFERENCE_DATA §9). Never copy names,
    phones or emails from the client's Excel. Phones use the +9190000xxxxx pattern; emails @example.com
    (customers) and @elementra.test (users).
  • SECRETS: nothing real in the repo; .env.example holds placeholders only.
  • EXTERNAL APIS: never call Meta/WhatsApp/Google for real. Providers sit behind interfaces with a
    simulator/local default; real providers are stubs enabled only by env vars.
  • TIME: store UTC; compute working hours and display in Asia/Kolkata (servers run in UTC).
  • HONESTY: anything not fully working carries its FeatureBadge; lib/features.ts is the single
    registry that drives badges, the Build Status page and STATUS.md.
  • EXPLAINABILITY: every automatic decision (routing, assignment, reminders, handover) writes a
    human-readable timeline entry.
  • KEEP WORKING: existing login, Contacts, Companies, Deals must keep working at every commit.
  • Keep business logic in pure functions under lib/domain/** and unit-test them with Vitest.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. HOW TO WORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Create a git branch: feature/crm-demo. Commit at the end of every phase with a clear message
    ("phase 2: routing brain + scenarios"). Never force-push; never commit .env.
  • Use a task list. Phases are in spec §18 (0 → 7). Each phase must end with a running app.
  • Quality gates before every phase commit: npm run lint, npm run typecheck, npm test.
    At phase 7 also: npm run build. Fix failures; don't skip or silence them.
  • Keep two living files:
      project_docs/IMPLEMENTATION_PLAN.md — audit findings, how the spec maps onto existing code,
        decisions you made where the spec was silent, deviations, risks.
      STATUS.md (repo root) — generated/maintained from lib/features.ts: feature, status, notes,
        how to demo it, known gaps.
  • Add a short "Elementra CRM — project facts" section to CLAUDE.md (ports, commands, folder map,
    pointers to project_docs/). Don't delete existing content.
  • When the spec and the existing code disagree on conventions, follow the existing code and log
    it in IMPLEMENTATION_PLAN.md. When the spec is silent, choose the simplest option that demos well
    and log it. Only stop to ask me if a change would alter the stack, delete existing features, or
    break the existing data model in a way migrations can't handle.
  • Prefer finishing a vertical slice properly over starting many half-screens. Placeholder screens
    come in phase 6, and must still look intentional (realistic layout + badge + one-line explanation).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. PHASE 0 NOW — then STOP for my review
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  a. Read everything in section 1 and audit the codebase.
  b. Write project_docs/IMPLEMENTATION_PLAN.md with:
       - existing stack versions, scripts, folder conventions, UI components available, auth setup
         (how the session/JWT is built, how proxy.ts protects routes), existing Prisma models with
         their fields, existing seed;
       - exactly how spec §7 will be merged into the existing schema (field by field for User,
         Contact, Company, Deal) and the migration plan;
       - the route/page map you will add, and which existing pages you'll extend;
       - any conflicts or risks, and your decisions.
  c. Add docker-compose.yml, move the app to port 4610, update .env.example, package.json scripts
     (spec §5), and the README local-setup section.
  d. Verify: `npm run db:up` → `npm run db:migrate` → `npm run db:seed` → `npm run dev` serves on
     http://localhost:4610 and the existing login + dashboard still work.
  e. Commit ("phase 0: audit, ports, local db") and then STOP. Reply with: a 10-line summary of
     the audit, the schema-merge plan, anything you need from me, and "Ready for phase 1".

After I reply "go", run phases 1 → 7 back to back WITHOUT stopping between phases, unless you
hit one of the blockers listed in section 4. After each phase, print a 3-line progress note
(what's done, what's next, anything I should look at).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. DEFINITION OF DONE (end of phase 7)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • The acceptance demo script in spec §19 runs end to end, twice in a row, after `npm run db:reset`
    with `npm run dev:all` running. Walk through it yourself (use Playwright or a browser if you have
    one; otherwise exercise the same paths through server actions/route handlers and tests) and fix
    anything that breaks.
  • All 10 scenarios in 02_REFERENCE_DATA §8 produce the expected branch/rule/queue.
  • Unit tests cover: phone normalisation; pincode/alias/fuzzy resolution (Borivalli, Goregoan,
    Kandiwali; "Andheri East" vs "Andheri West" never confused; "NA" → none); Vashi pincode rule
    beating distance; Panvel out of area; round-robin order and on-leave skip; night-lead due time;
    every reminder rule firing exactly once across repeated engine runs; Meta CSV prefix stripping.
  • Every sidebar item opens a finished-looking page; non-LIVE items show the correct badge.
  • Lead list, lead detail and My Day work at 390 px width.
  • lint, typecheck, test and build all pass. README explains setup, ports, demo logins, demo reset,
    the local reminder runner, and the Vercel Hobby once-a-day cron limitation.
  • Final reply: what's LIVE / SIMULATED / PREVIEW / IN_PROGRESS / PLANNED (from lib/features.ts),
    how to run the demo, known gaps, and suggested next steps.

Begin with Phase 0.
```

---

### Follow-up prompts you may need

**Continue in a fresh session (if context gets long):**
```text
Continue the Elementra CRM demo build. Read CLAUDE.md, project_docs/IMPLEMENTATION_PLAN.md,
STATUS.md and project_docs/01_PRODUCT_AND_DEMO_SPEC.md (§18 phases, §19 acceptance script).
Check `git log --oneline` to see which phases are committed, then continue from the next
unfinished phase. Same rules as before: ports 4610/5610/5611, synthetic data only, gates before
each commit, no stopping between phases unless blocked.
```

**Final demo-readiness pass (run the day before the meeting):**
```text
Do a demo-readiness pass on the Elementra CRM. Run `npm run db:reset`, start `npm run dev:all`,
and walk the acceptance script in project_docs/01_PRODUCT_AND_DEMO_SPEC.md §19 step by step.
Fix any errors, broken layouts at 390 px, empty states that look unfinished, wrong badges, or
numbers that look implausible on the dashboard. Then update STATUS.md and give me a list of
anything I should avoid clicking during the demo.
```

**If the routing looks wrong for a specific address:**
```text
In the Routing playground, "<address>" resolves to <X> but should be <Y>. Explain from
lib/domain/geo/resolve.ts and lib/domain/routing/decide.ts why, then fix it (gazetteer alias,
pincode rule, or matcher logic), and add a unit test for this exact input.
```
