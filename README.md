# Elementra CRM

Lead-management CRM for Elementra's Experience Centres (Worli, Andheri, Tardeo, Pune): intake → routing by site location → assignment → follow-ups. Frontend and backend (Server Actions + API routes) deploy together.

Same stack as PI-Education:

- **Next.js 16** (App Router, `proxy.ts` for route protection), **React 19**
- **Prisma 6** + **PostgreSQL** (Docker locally, Neon in production)
- **NextAuth v4** (email + password, JWT sessions)
- **Tailwind CSS 4**
- **Vercel** (`sin1` region, next to a Singapore Neon database)

## Ports

Other projects on this machine use 3000 and 5432, so this one doesn't.

| Service | Port |
| --- | --- |
| Next.js (`dev` / `start`) | **4610** → http://localhost:4610 |
| PostgreSQL (Docker) | **5610** on the host → 5432 in the container |
| Prisma Studio | **5611** |

## Local setup

Needs Node 20+, npm and Docker (with Compose v2).

```bash
cp .env.example .env      # defaults work locally; set a real NEXTAUTH_SECRET (openssl rand -base64 32)
npm install
npm run db:up             # starts Postgres 16 in Docker on :5610 and waits until healthy
npm run db:migrate        # applies prisma/migrations
npm run db:seed           # creates the admin from SEED_ADMIN_* (admin@elementra.test / Admin@1234)
npm run dev               # http://localhost:4610
```

Other commands:

| Command | What |
| --- | --- |
| `npm run db:down` | stop the Postgres container (data stays in the `elementra_crm_pgdata` volume) |
| `npm run db:reset` | drop the local database, re-apply migrations and re-seed (**local only**) |
| `npm run db:studio` | Prisma Studio on :5611 |
| `npm run lint` · `npm run typecheck` · `npm test` | quality gates (ESLint, `tsc --noEmit`, Vitest) |
| `npm run build` · `npm start` | production build, served on :4610 |

## Deploy (Vercel)

1. Create a Neon database (region: Singapore) and copy its connection string.
2. Import the repo in Vercel; set `DATABASE_URL`, `NEXTAUTH_URL` (the site URL) and `NEXTAUTH_SECRET`. Keep `DEMO_MODE` unset or `false` on any deployment real users can reach.
3. Apply migrations against the production database: `DATABASE_URL=... npx prisma migrate deploy`, then `npm run db:seed` once.
   - If that database was created earlier with `db push` (before migrations existed), first run `DATABASE_URL=... npx prisma migrate resolve --applied 20261028071627_init`.

## Layout

| Path | What |
| --- | --- |
| `app/(auth)/login` | Sign-in page |
| `app/dashboard` | Overview, Contacts, Companies, Deals (Server Components) |
| `app/dashboard/actions.ts` | Server Actions (create / update) |
| `app/api/health` | Database health check |
| `lib/auth.ts` | NextAuth config, `requireUser()` |
| `prisma/schema.prisma` | Data model; migrations in `prisma/migrations` |
| `project_docs/` | Product spec, reference data, demo script, implementation plan |
