# Staging runbook — Vercel + Neon

The app is deploy-ready. Publishing the staging link needs a Vercel project and a Neon database, which this machine doesn't have access to (no `vercel` CLI, no accounts). Nothing secret is stored in the repo; every value below goes into the Vercel dashboard.

## 1. Database (Neon)

1. Create a Neon project in the **Singapore** region (`aws-ap-southeast-1`, closest to Vercel `sin1`).
2. Copy two connection strings from *Connection details*:
   - **Pooled** (host contains `-pooler`): use for the app at runtime. Append `?sslmode=require&pgbouncer=true&connection_limit=1`.
   - **Direct** (no `-pooler`): use for migrations. Append `?sslmode=require`.

## 2. Apply the schema (from your machine, once per release)

```bash
DATABASE_URL="<direct Neon URL>" npm run staging:db
```

`staging:db` = `prisma migrate deploy` → `prisma db seed` (masters, roles, branches, demo users; admin from `SEED_ADMIN_*` in your local `.env`) → demo leads. The `DATABASE_URL` on the command line wins over the one in `.env`, so your local database isn't touched. Re-running it later is safe for migrations and the base seed; the last step **replaces the demo leads**, so for later releases run only `DATABASE_URL="…" npx prisma migrate deploy`.

The migration chain applies cleanly to an empty database (verified with `prisma migrate deploy` on a scratch DB). Migrations run from your machine, not during the Vercel build, so a broken build can't half-migrate staging. The schema has no `directUrl`; the direct URL is only used in these commands.

## 3. Vercel project

- Import the Git repo; framework **Next.js**; build command: default (`next build`; `postinstall` runs `prisma generate`).
- Region: `sin1` (already in `vercel.json`).
- **Environment variables** (Production + Preview):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Pooled Neon URL (step 1) |
| `NEXTAUTH_URL` | `https://<your-project>.vercel.app` (the production URL Vercel shows; add it after the first deploy, then redeploy) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` (new value, not the local one) |
| `DEMO_MODE` | `true` for UAT (quick-login chips + demo panel; demo panel needs the `demo.use` permission = Super Admin only). Set `false` before real users log in. |
| `CRON_SECRET` | random string; Vercel Cron sends it as `Authorization: Bearer …` |
| `PUBLIC_FORM_API_KEY` | random string for `/api/public/leads` |
| `APP_TIMEZONE` | `Asia/Kolkata` |
| `META_VERIFY_TOKEN` | any string (simulator works without the other Meta/WhatsApp/Google vars) |

`SEED_ADMIN_*` are only needed where you run `db:seed` (step 2), not in Vercel.

## 4. Cron

`vercel.json` runs `/api/cron/reminders` once a day at 04:00 UTC (09:30 IST), the Hobby-plan limit. For minute-level reminders (SLA alerts) use Vercel Pro, or an external pinger (cron-job.org, GitHub Actions) calling `GET https://<domain>/api/cron/reminders` with the header `Authorization: Bearer $CRON_SECRET` every 5 minutes. Managers can also press **Automations → Run now**.

## 5. Smoke test on the staging URL

1. `/login` → quick-login **Super Admin** → Dashboard loads with data.
2. **Masters → Pipelines & Statuses**: rename "3. Lead Qualified" → the Pipeline kanban column shows the new heading. Rename it back.
3. **Masters → Sources**: add "Housing.com" → it's in **+ New lead → Source**. Deactivate it → gone from the dropdown.
4. **Masters → Branches**: add Thane (19.2183, 72.9781, 15 km) → **Map → playground** "Thane West" → Thane. Deactivate → Andheri again.
5. **Masters → Roles** → Preview as… Vikram Sethi: three branches only.
6. Log in as **Worli Manager**: Leads shows Worli only; open a Pune lead URL (copy from the Super Admin session) → "not found".
7. Log in as **Andheri Exec**: only Arjun's own leads.
8. **+ New lead** with the phone of an existing open lead → "already has an open lead · Open it".
9. **Demo panel → Full-home enquiry** → lead lands in **Turnkey / Full Home**, first stage.
10. `/enquire` on a phone → submit → lead appears, routed.
11. `GET /api/health` → `{ ok: true }`.

## 6. Rollback

Vercel → Deployments → previous deployment → *Promote*. Schema changes are additive after the Week 1 migration; to undo the Week 1 migration on staging, restore Neon's branch from before the deploy (Neon → Branches → Restore).
