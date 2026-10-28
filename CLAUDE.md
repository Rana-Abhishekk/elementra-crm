@AGENTS.md

## Elementra CRM — project facts

- **Ports:** app 4610 (`npm run dev`), Postgres 5610 (Docker, `npm run db:up`), Prisma Studio 5611. Never use 3000 or 5432.
- **Commands:** `db:up` → `db:migrate` → `db:seed` → `dev`. Gates before every commit: `npm run lint`, `npm run typecheck`, `npm test` (+ `npm run build` before hand-off).
- **Folders:** `app/dashboard/**` (pages + `actions.ts` server actions), `app/api/**` (webhooks, public, cron, polling), `lib/prisma.ts` (client), `lib/auth.ts` (NextAuth, `requireUser`), `lib/domain/**` (pure business logic, unit-tested with Vitest), `lib/features.ts` (feature-status registry → badges, Build Status page, `STATUS.md`), `prisma/` (schema, migrations, seeds).
- **Rules:** all data synthetic (`+9190000xxxxx`, `@example.com`, `@elementra.test`); no real Meta/WhatsApp/Google calls (simulators by default); store UTC, show IST; every automatic decision writes a timeline entry.
- **Docs:** spec `project_docs/01_PRODUCT_AND_DEMO_SPEC.md`, data `project_docs/02_REFERENCE_DATA.md`, plan & decisions `project_docs/IMPLEMENTATION_PLAN.md`, status `STATUS.md`.
