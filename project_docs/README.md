# project_docs — Elementra CRM

Docs for the first client demo of the Elementra lead-management CRM (Next.js 16 · Prisma 6 · PostgreSQL · NextAuth v4 · Tailwind 4 · Vercel).

| File | Who it's for | What it is |
|---|---|---|
| `00_CLAUDE_KICKOFF_PROMPT.md` | You → Claude Code | The prompt to paste to start the build, plus follow-up prompts |
| `01_PRODUCT_AND_DEMO_SPEC.md` | Claude Code (and you) | The build spec: scope tiers, data model, routing, reminders, screens, phases, acceptance script |
| `02_REFERENCE_DATA.md` | Claude Code | Enums in the client's wording, branches, locality map, users, WhatsApp templates (EN/HI), Meta formats, demo scenarios, seed rules |
| `03_CLIENT_PITCH_AND_DEMO_SCRIPT.md` | You → client | Opener, 15-min demo talk track, status board mapped to the proposal's 5 weeks, sheet insights, Rules Sheet questions, follow-up message |
| `04_UNDERSTANDING_THE_PROJECT.md` | You | The business, their Excel decoded, the proposal terms, how routing and reminders work inside, code map, integrations, Q&A prep, demo-day checklist |
| `05_DEMO_REHEARSAL_GUIDE.md` | You | Step-by-step demo script with what to click, say and point at |
| `06_WEEK2_SPEC_MASTERS_ROLES_QUALIFICATION_CHATBOT.md` | Claude Code (and you) | End of Week 2 milestone: masters (pipelines/statuses, branches, sources, products, areas, other lists), users & roles with branch-based visibility, qualification, duplicates, chatbot, staging. **Overrides 01 where they conflict.** |
| `07_CLAUDE_PROMPT_WEEK2.md` | You → Claude Code | The prompt to start the Week 2 work, plus follow-up prompts |
| `08_WEEK1_TEST_GUIDE.md` | You / testers | Step-by-step checklist to test every Week 1 feature (roles, segregation, users, masters, phone key) + regression |
| `09_WEEK1_DEMO_GUIDE.md` | You → client | End-of-Week-1 demo script (20–25 min + 10-min version), cheat sheet, reset, don't-click list |
| `10_WEEK1_EXPLAINED.md` | You / new team members | What was built and why, how it works, done / not-done status for all 5 weeks |

Files Claude will create during the build:
- `project_docs/IMPLEMENTATION_PLAN.md`: audit of the existing code + how the spec maps onto it
- `STATUS.md` (repo root): live feature status generated from `lib/features.ts`

**Local ports:** app **4610** · Postgres **5610** · Prisma Studio **5611** (3000 and 5432 are left free for other projects).

**Order of use:** read `04` → paste `00` into Claude Code → review `IMPLEMENTATION_PLAN.md` after Phase 0 → let it run phases 1–7 → rehearse with `03`.
