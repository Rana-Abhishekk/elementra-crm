# Elementra CRM

Lead-management CRM for Elementra's Experience Centres (Worli, Andheri, Tardeo, Pune). Every lead — Instagram/Facebook lead ads, website, WhatsApp, walk-ins, CSV imports — is read for its site location, routed to the right branch, assigned to a person (skipping people on leave), and followed up by a server-side reminder engine. Every automatic decision is explained on the lead's timeline.

What works today and what is simulated: see **[STATUS.md](STATUS.md)** (generated from `lib/features.ts`) or the **Build Status** page in the app.

## Stack

- **Next.js 16** (App Router, Server Actions, Route Handlers, `proxy.ts`), **React 19**, TypeScript strict
- **Prisma 6** + **PostgreSQL** (Docker locally, Neon in production)
- **NextAuth v4** (email + password, JWT sessions carrying role + branch)
- **Tailwind CSS 4**, recharts, dnd-kit, Leaflet (OpenStreetMap), sonner, zod, date-fns
- **Vitest** for the domain logic
- **Vercel** (`sin1`, next to a Singapore Neon database)

## Ports

Other projects on this machine use 3000 and 5432, so this one doesn't.

| Service | Port |
| --- | --- |
| Next.js (`dev` / `start`) | **4610** → http://localhost:4610 |
| PostgreSQL (Docker) | **5610** on the host → 5432 in the container |
| Prisma Studio | **5611** |

## Local setup

Needs Node 20+, npm and Docker (Compose v2).

```bash
cp .env.example .env      # defaults work locally; set a real NEXTAUTH_SECRET (openssl rand -base64 32)
npm install
npm run db:up             # Postgres 16 in Docker on :5610, waits until healthy
npm run db:migrate        # applies prisma/migrations
npm run db:seed           # admin, branches, pincode rules, locality map, demo users, templates, settings
npm run db:seed:demo      # ~180 synthetic leads over the last 75 days (relative to now)
npm run dev:all           # app on :4610 + the local reminder runner
```

Then open http://localhost:4610 and use a quick-login chip.

### Demo logins (only seeded when `DEMO_MODE=true`)

All demo users share the password **`Demo@1234`**; the admin uses `SEED_ADMIN_*` from `.env` (default `admin@elementra.test` / `Admin@1234`).

| Chip | User | Role | Sees |
| --- | --- | --- | --- |
| Owner | aarav@elementra.test | Owner | everything, Demo panel |
| Online Desk | ananya@elementra.test | Online Desk (pre-sales) | own + Needs-location queue |
| Worli Manager | kabir@elementra.test | Sales manager | Worli + Out-of-area queue |
| Andheri Rep | arjun@elementra.test | Sales rep | own leads |
| Pune Rep | omkar@elementra.test | Sales rep | own leads |

Other demo users: Sara Khan (Online Desk), Ishita Desai, Rohan Pillai (Worli), Farah Siddiqui, Meera Joshi (Andheri), Tanvi Shah, Dev Bhatia (Tardeo), Sneha Kulkarni (Pune). All people, phones (`+91 90000 xxxxx`) and emails (`@example.com`, `@elementra.test`) are synthetic.

## Commands

| Command | What |
| --- | --- |
| `npm run dev` | Next.js dev server on :4610 |
| `npm run cron:dev` | calls `/api/cron/reminders` every 60 s (the local reminder runner) |
| `npm run dev:all` | both of the above (concurrently) |
| `npm run db:up` / `db:down` | start / stop the Postgres container (data stays in the `elementra_crm_pgdata` volume) |
| `npm run db:migrate` | apply migrations (`prisma migrate dev`) |
| `npm run db:seed` | base data (idempotent; templates and settings are create-only so your edits survive) |
| `npm run db:seed:demo` | replace demo data: clears leads/tasks/messages/notifications/audit, regenerates the history, runs the engine once (~2 s) |
| `npm run db:reset` | **local only**: drop the database, re-apply migrations, re-seed, seed demo data |
| `npm run demo:check` | runs the 10 demo scenarios against the database and checks branch / rule / queue |
| `npm run status` | regenerate `STATUS.md` from `lib/features.ts` |
| `npm run db:studio` | Prisma Studio on :5611 |
| `npm run lint` · `typecheck` · `test` · `build` | quality gates |

### Demo reset

Before a demo: `npm run db:seed:demo` (or **Demo panel → Reset demo data** in the app). Dates are relative to "now", so the dashboard always looks current: ~10 overdue follow-ups, ~12 due today, visits in the next 3 days (one tomorrow 11:00 at Worli), ~8 leads needing a location, ~6 out of area, 9 won deals with projects.

`npm run db:reset` does the same plus dropping and recreating the schema. Prisma refuses to run `migrate reset` from an AI agent without the user's explicit consent — run it yourself.

The Demo panel (`/dashboard/demo`, Owner/Admin, or the gold **Demo** button) has the 10 routing scenarios, "10 random leads", "Run reminders now", "Simulate customer WhatsApp reply", "Simulate Google Sheet row" and Reset.

## The reminder engine (and the Vercel Hobby limit)

Rules R1–R9 (SLA, escalation, follow-ups due, stale stages, visit reminders, visit outcome, no-response, revive, daily digest) live in `lib/domain/reminders/` and run on the server. They're idempotent: running twice creates nothing new.

They're triggered by:

1. **`GET /api/cron/reminders`** with `Authorization: Bearer $CRON_SECRET`.
2. **Locally**, `npm run cron:dev` calls it every 60 s (`npm run dev:all` starts it for you).
3. **"Run now"** on the Automations page and the Demo panel.

**Vercel Hobby only allows cron jobs that run once a day** (deploys fail otherwise). `vercel.json` therefore schedules `0 4 * * *` (04:00 UTC = 09:30 IST, the morning digest). For minute-level reminders in production, use Vercel Pro (`*/5 * * * *`) or an external scheduler (e.g. a GitHub Action or cron-job.org hitting the endpoint with the bearer token).

## Integrations — simulated by default

Nothing calls Meta, WhatsApp or Google unless their env vars are set.

| Integration | Where | Without credentials |
| --- | --- | --- |
| Meta Lead Ads | `GET/POST /api/webhooks/meta/leadgen` | Handshake works with `META_VERIFY_TOKEN`; demo payloads embed `simulated_lead`; real lead ids need `META_PAGE_ACCESS_TOKEN` (stub) |
| WhatsApp Cloud API | `lib/domain/messaging/` | Simulator: messages are stored with SENT → DELIVERED → READ ticks, never sent |
| Google Maps geocoding | `lib/domain/geo/providers/google.ts` | Local locality map + pincode rules |
| Google Sheets | `lib/domain/integrations/sheets.ts` | "Simulate Google Sheet row" |
| Website form | `/enquire`, `POST /api/public/leads` (`x-api-key: $PUBLIC_FORM_API_KEY`) | Live |

## Deploy (Vercel)

1. Create a Neon database (region: Singapore) and copy its connection string.
2. Import the repo in Vercel; set `DATABASE_URL`, `NEXTAUTH_URL` (the site URL), `NEXTAUTH_SECRET`, `CRON_SECRET`, `PUBLIC_FORM_API_KEY`, `META_VERIFY_TOKEN`. Set `DEMO_MODE=true` **only** for a demo deployment: it shows quick-login chips with the shared demo password.
3. Apply migrations: `DATABASE_URL=... npx prisma migrate deploy`, then `DATABASE_URL=... npm run db:seed` once (and `db:seed:demo` for a demo).
   - If that database was created earlier with `db push` (before migrations existed), first run `DATABASE_URL=... npx prisma migrate resolve --applied 20261028071627_init`.

## Layout

| Path | What |
| --- | --- |
| `app/(auth)/login` | sign-in + demo quick-login chips |
| `app/enquire` | public website enquiry form |
| `app/dashboard/**` | the CRM (each area has its `page.tsx` + `actions.ts` server actions) |
| `app/api/**` | webhooks, public API, cron, notifications polling, CSV exports, health |
| `lib/domain/**` | pure business logic (phone, time, geo, routing, reminders, messaging, integrations), unit-tested |
| `lib/domain/leads/ingest.ts` | **the one entry point for every new lead** |
| `lib/data/**` | read queries (always scoped by `leadWhereForUser`) |
| `lib/access.ts` | roles, scoping, page guards |
| `lib/features.ts` | feature-status registry → badges, Build Status page, `STATUS.md` |
| `lib/demo/**` | synthetic pools, scenarios, history generator |
| `prisma/` | schema, migrations, `seed.ts` (base), `seed-demo.ts`, `fixtures/meta-leads-sample.csv` |
| `project_docs/` | spec, reference data, demo script, implementation plan |
