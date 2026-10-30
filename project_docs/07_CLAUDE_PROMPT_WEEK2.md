# Week 2 prompt for Claude Code

> Paste everything inside the box into Claude Code, opened at the root of `elementra-crm`, after copying `06_WEEK2_SPEC_MASTERS_ROLES_QUALIFICATION_CHATBOT.md` into `project_docs/`.

---

```text
We're continuing the Elementra CRM (the demo build from project_docs/01 is done and committed).
The client meeting added new requirements, and the contract's "End of Week 2" milestone is due:
"Core CRM foundation built, lead qualification logic, duplicate handling, and chatbot flow ready
on staging". The core foundation now also includes admin-managed MASTERS (pipelines & statuses,
branches, sources, products, areas, other lists, users, roles) and branch-based USER & ROLE
management. Your job is to deliver all of that.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. READ FIRST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. CLAUDE.md, AGENTS.md, STATUS.md, project_docs/IMPLEMENTATION_PLAN.md
  2. project_docs/06_WEEK2_SPEC_MASTERS_ROLES_QUALIFICATION_CHATBOT.md  ← source of truth for
     this work. Where it conflicts with project_docs/01 (enums in §7, roles in §12), 06 WINS.
  3. project_docs/01_PRODUCT_AND_DEMO_SPEC.md §8 (intake/routing) and §9 (reminders) for context
  4. project_docs/05_DEMO_REHEARSAL_GUIDE.md — the client demo script. It must keep working
     after this refactor (same flows; labels may now come from masters).
  Then inspect the current prisma/schema.prisma, lib/auth/*, lib/domain/*, lib/features.ts,
  the dashboard pages, reports, kanban, reminder rules and integrations mappers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. WHAT TO BUILD (details in 06)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  A. MASTERS (06 §3–4): replace the LeadStage / LostReason / LeadSource / Product / Role enums
     with tables. Pipelines + stages (rename headings, reorder, add, colours, won/lost, flags,
     multiple pipelines with auto-selection by product), Branches (incl. pincode rules + map pin),
     Sources (with integration keys), Products (with Meta answer keys), Areas & Pincodes
     (Locality), Other lists (LookupValue). Shared MasterTable pattern: Used-by count,
     deactivate instead of delete when in use, "Merge into…", audit on every change.
     Nothing business-specific stays hard-coded: code uses stage CATEGORY and FLAGS, never labels.
  B. USERS & ROLES (06 §5): Role = scope (OWN / BRANCH / ALL) + permission checkboxes; one role
     per user; users have a home branch + extra branches. Visibility lives ONLY in
     lib/auth/scope.ts (leadWhere / userWhere); permissions ONLY via can()/requirePermission().
     Worli manager never sees Pune users or data; executives see only their own leads; Super Admin
     sees everything. Out-of-scope lead URLs return 404. JWT holds only userId; role/permissions
     are loaded per request with React cache(), so changes apply without re-login and deactivated
     users are rejected on the next request. Anti-escalation guards from 06 §5.4. Screens: Users,
     Roles (with clone + "Preview as…"), Team performance, /account.
  C. QUALIFICATION (06 §6): new lead fields from Other lists, scoreLead() pure function, auto
     priority, qualification gate on stages with requiresQualification, override permission,
     Qualification card, settings.
  D. DUPLICATES (06 §7): phone/email detection, intake + manual policies, live check on the
     new-lead form, Possible duplicates queue with Merge / Not a duplicate / Link, nightly R10.
  E. CHATBOT (06 §8): rule-based (no LLM) flow engine as a pure function, seeded EN/HI flow,
     website widget at /chat (+ button on /enquire, public API with rate limit + honeypot),
     WhatsApp via the Inbox simulator, test console, conversations view, human takeover, R11
     nudge/expiry, completion → ingestLead → routing → qualification.
  F. STAGING (06 §9): deploy-ready on Vercel + Neon, STAGING.md runbook. Deploy a preview only if
     the vercel CLI is already logged in on this machine; never create accounts or write secrets.
  G. Build Status / lib/features.ts grouped by the 4 contract milestones (06 §0), honest statuses.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. HARD RULES (unchanged from before, plus new ones)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Stack unchanged: Next.js 16, React 19, Prisma 6 (do NOT upgrade to 7), NextAuth v4, Tailwind 4.
    No new frameworks; no RBAC library — the permission system is our own small code.
  • Ports: app 4610, Postgres 5610, Prisma Studio 5611. Never 3000 or 5432.
  • Synthetic data only. No real names/phones from the client's sheet. No real external API calls.
  • Prisma: enum and table share Postgres' type namespace — drop/convert the enum before creating
    a same-named table. Name every duplicate relation (06 §3 notes). The migration chain must apply
    on an empty DB and via `prisma migrate deploy`.
  • Security is server-side: every server action and route handler calls requirePermission()
    and filters with leadWhere()/userWhere(). Hiding buttons is not security.
  • Never hard-delete a master value or user that is referenced; deactivate or merge.
  • Audit every admin change (actor, before → after).
  • Every automatic decision still writes a human-readable timeline line.
  • Existing features and the 05 rehearsal script must keep working at every commit.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. HOW TO WORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Branch: feature/week2-masters-rbac (from the current main/demo branch). Commit per phase.
  • Gates before every commit: npm run lint, npm run typecheck, npm test. Phase W7 also npm run build.
  • Use a task list. Keep IMPLEMENTATION_PLAN.md (new "Week 2" section), STATUS.md and CLAUDE.md
    updated. Log decisions where 06 is silent; pick the simplest option that demos well.
  • Only stop to ask me if something would change the stack, delete an existing feature, or lose
    data in a way a migration can't handle.

Phases:
  W0  Audit & plan → STOP (see section 5)
  W1  Masters data layer: schema + migration(s) + seed (client's 14 statuses as stages, second
      "Turnkey / Full Home" pipeline, sources, products incl. "Full Home Interiors", lookups,
      roles, users mapped to roles + "Vikram Sethi" regional manager). Refactor EVERY enum usage
      (domain, routing, reminders R1/R3, reports, dashboard, kanban, filters, integrations mappers,
      demo generator, tests) to masters. All existing tests + demo scenarios pass.
  W2  Masters admin UI: MasterTable pattern; Pipelines & Statuses editor with drag reorder and
      validation; kanban pipeline switcher; Branches (pincode rules, map pin); Sources; Products;
      Areas & Pincodes (with Test); Other lists.
  W3  Users & roles: permissions catalogue, scope.ts, can()/requirePermission(), getCurrentUser()
      via cache(), anti-escalation guards, Users + Roles screens, deactivate-with-reassign,
      lastLoginAt, mustChangePassword + /account, Team performance page. Scope + escalation tests.
  W4  Qualification: fields, scoreLead(), gate + override, Qualification card, settings, list
      column/filter, demo seed recompute. Tests.
  W5  Duplicates: detection, policies, live check on the new-lead form, queue + merge/dismiss/link,
      R10. Tests.
  W6  Chatbot: models, engine (pure) + run orchestrator, seeded flow, /chat widget + public API
      (rate limit, honeypot), Inbox simulator hook, test console, conversations, R11, demo scenario
      "Chatbot — WhatsApp enquiry". Engine tests (06 §8.5).
  W7  Staging readiness + STAGING.md, Build Status by contract milestones, docs, then run the
      acceptance script 06 §11 end to end (browser if available, otherwise scripts against the DB)
      and the 05 rehearsal script. Fix what breaks.

After each phase print 3 lines: done / next / anything I should check.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. PHASE W0 NOW — then STOP for my review
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  a. Read section 1 and grep the codebase for every use of the enums being replaced (LeadStage,
     LostReason, LeadSource, Product, Role) and for hard-coded stage/source/product labels.
     List them by file in the plan.
  b. Write "Week 2" in project_docs/IMPLEMENTATION_PLAN.md: the schema diff (field by field),
     the migration approach (data-mapping vs destructive + reseed, and why), how sessions/auth
     change, the refactor list from (a), the route/page map for new screens, risks, decisions.
  c. Do NOT change code yet. Reply with a 10-line summary + anything you need from me +
     "Ready for W1".

After I reply "go", run W1 → W7 back to back without stopping, unless blocked as described above.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. DEFINITION OF DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • 06 §11 acceptance script passes end to end after `npm run db:reset`; 05 rehearsal steps
    still work.
  • No business label is hard-coded in code (grep proves it; list remaining exceptions, if any,
    in STATUS.md with a reason).
  • Tests cover: scope (Worli ≠ Pune, executive ≠ colleague, 404 out of scope, regional manager
    sees exactly 3 branches), anti-escalation (role ⊆ own perms, scope ≤ own, last Super Admin,
    self-edit blocked), permission change without re-login, deactivated user rejected, stage
    master validation, pipeline auto-selection, scoring + gate, duplicate detection + merge +
    dismissal, chatbot engine paths, existing routing/reminder tests.
  • lint, typecheck, test, build pass. STAGING.md complete. STATUS.md and Build Status honest.
  • Final reply: what's LIVE / SIMULATED / PREVIEW / IN_PROGRESS for the End of Week 2 milestone,
    what I need to do for staging (exact commands/env), and what I should avoid clicking in a
    client demo because it wasn't verified end to end.

Begin with Phase W0.
```

---

### If the session gets long

```text
Continue the Elementra CRM Week 2 build. Read CLAUDE.md, STATUS.md, the "Week 2" section of
project_docs/IMPLEMENTATION_PLAN.md and project_docs/06_WEEK2_SPEC_MASTERS_ROLES_QUALIFICATION_CHATBOT.md.
Check `git log --oneline` to see which W-phases are committed and continue from the next one.
Same rules: ports 4610/5610/5611, Prisma 6, synthetic data, server-side permission checks,
gates before each commit, no stopping unless blocked.
```

### Quick security check you can ask for at the end

```text
Do a permissions audit of the Elementra CRM. For every server action and route handler under
app/, list: the permission it requires, whether it filters by leadWhere/userWhere, and any that
don't. Then log in (or simulate sessions) as Worli Branch Manager, Andheri Sales Executive and
Vikram (regional) and try to read/modify a Pune lead and a Pune user via direct URLs and direct
action calls. Fix every hole you find and add a test for each.
```
