# Elementra CRM

Contacts, companies and deals in one Next.js app — frontend and backend (Server Actions + API routes) deploy together.

Same stack as PI-Education:

- **Next.js 16** (App Router, `proxy.ts` for route protection), **React 19**
- **Prisma 6** + **PostgreSQL** (Neon in production)
- **NextAuth v4** (email + password, JWT sessions)
- **Tailwind CSS 4**
- **Vercel** (`sin1` region, next to a Singapore Neon database)

## Local setup

```bash
cp .env.example .env      # fill DATABASE_URL, NEXTAUTH_SECRET, SEED_ADMIN_*
npm install
npm run db:migrate        # creates the tables (first run: name the migration "init")
npm run db:seed           # creates the admin from SEED_ADMIN_*
npm run dev               # http://localhost:3000
```

## Deploy (Vercel)

1. Create a Neon database (region: Singapore) and copy its connection string.
2. Import the repo in Vercel; set `DATABASE_URL`, `NEXTAUTH_URL` (the site URL) and `NEXTAUTH_SECRET`.
3. Apply migrations against the production database: `DATABASE_URL=... npx prisma migrate deploy`, then `npm run db:seed` once.

## Layout

| Path | What |
| --- | --- |
| `app/(auth)/login` | Sign-in page |
| `app/dashboard` | Overview, Contacts, Companies, Deals (Server Components) |
| `app/dashboard/actions.ts` | Server Actions (create / update) |
| `app/api/health` | Database health check |
| `lib/auth.ts` | NextAuth config, `requireUser()` |
| `prisma/schema.prisma` | User, Company, Contact, Deal, Activity |
