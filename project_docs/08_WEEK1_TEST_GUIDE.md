# Elementra CRM — Week 1 Test Guide (step by step)

> **What this is:** an exact checklist to test everything built for the **Week 1 — CRM Foundation** milestone: users, roles & permissions, branch segregation, the masters (pipelines/statuses, sources, products, branches), phone number as the customer key, team performance and the account page — plus a short regression pass on the older features.
> **Who:** anyone. No coding needed. Tick each box; write the result in the "Notes" column if something differs.
> **Time:** ~75 minutes for everything; ~25 minutes for the ★ items only.
> **Branch / commits:** `feature/week2-masters-rbac` · `179dc4b`, `dd72dae`.

---

## 0. Setup (5 min)

Run these from the project folder (`elementra-crm`):

```bash
npm run db:up          # Postgres on port 5610 (Docker)
npx prisma migrate deploy
npm run db:seed        # masters, roles, branches, demo users
npm run db:seed:demo   # ~180 synthetic leads + tasks (resets demo data)
npm run dev            # app on http://localhost:4610
```

> If a dev server was already running from before 30 Oct, **stop it and start it again** — it still holds the old database client and will show errors.

**Two browser windows** make role testing much faster:
- **Window A** — normal Chrome.
- **Window B** — a second Chrome profile or an Incognito window (separate login).

### Demo logins (login page → "Demo quick login" chips; password for all: `Demo@1234`)

| Chip | Person | Role | Branch(es) | Sees |
|---|---|---|---|---|
| Super Admin | Aarav Mehta | Super Admin | — | everything |
| Online Desk | Ananya Rao | Online Desk | Online Desk | own leads + needs-location queue |
| Worli Manager | Kabir Malhotra | Branch Manager | Worli | Worli only |
| Regional Mgr | Vikram Sethi | Branch Manager | Worli + Andheri + Tardeo | those 3 branches |
| Pune Manager | Sneha Kulkarni | Branch Manager | Pune | Pune only |
| Andheri Exec | Arjun Nair | Sales Executive | Andheri | only his own leads |
| Pune Exec | Omkar Patil | Sales Executive | Pune | only his own leads |

Also: `admin@elementra.test` (password from `.env` → `SEED_ADMIN_PASSWORD`) = Super Admin.

---

## 1. Automated checks (2 min) ★

| ☐ | Command | Expected |
|---|---|---|
| ☐ | `npm run lint` | no errors, no warnings |
| ☐ | `npm run typecheck` | no output (passes) |
| ☐ | `npm test` | **201 tests passed** (scope, anti-escalation, permission change without re-login, deactivated user, stage rules, pipeline auto-selection, phone key, mappers, reminders, guard coverage) |
| ☐ | `npm run demo:check` | **All 11 scenarios OK** |
| ☐ | `npm run demo:acceptance` | **Acceptance run OK** (13 steps; resets demo data) |
| ☐ | `npm run build` | build finishes, route list printed |

---

## 2. Login, sessions, account

| # | ☐ | Steps | Expected result | Notes |
|---|---|---|---|---|
| 2.1 ★ | ☐ | Open `/login`. Click **Super Admin**. | Dashboard opens. Top-right shows **Aarav Mehta · Super Admin**. Sidebar has a **Masters** group (Pipelines & Statuses, Branches, Sources, Products, Users, Roles & permissions). | |
| 2.2 | ☐ | Log out (sidebar bottom → Sign out). Type `aarav@elementra.test` + a wrong password. | "Incorrect email or password." | |
| 2.3 | ☐ | Click your name (top-right) → **My account**. | Shows role **Super Admin**, data scope **All**, branches, designation, employee code, last sign-in, and every permission with ✓/✗. | |
| 2.4 | ☐ | On My account, change password: current `Demo@1234`, new `Demo@12345`, repeat. Log out, log in with the new password. Change it back to `Demo@1234`. | "Password changed". New password works. | |
| 2.5 | ☐ | Try a weak new password (`abc`). | "At least 8 characters, with a letter and a number." | |

---

## 3. Branch segregation (who sees what) ★

Do this in **Window B**, switching chips. Keep **Window A** as Super Admin.

| # | ☐ | Steps | Expected result | Notes |
|---|---|---|---|---|
| 3.1 ★ | ☐ | Window A (Super Admin) → **Leads → All**. Note the total. Open any **Pune** lead (Branch column = Pune) and copy its URL. Do the same for one **Andheri lead owned by Meera Joshi**. | You have two URLs. | |
| 3.2 ★ | ☐ | Window B → **Worli Manager**. **Leads → All**. | Only **Worli** leads (and out-of-area queue leads, which have no branch). The **Branch** filter lists only Worli. | |
| 3.3 ★ | ☐ | Still Worli Manager: paste the **Pune lead URL**. | **"This page could not be found"** (404) — not "access denied", so it doesn't even reveal the lead exists. | |
| 3.4 | ☐ | Worli Manager → **Masters → Users** (only Users is visible in Masters). | Only Worli people (Kabir, Ishita, Rohan, Vikram). **No Pune / Andheri people.** | |
| 3.5 | ☐ | Worli Manager → **Dashboard**, **Reports**, **Pipeline**, **Team performance**. | All numbers are Worli only. Description says "your branch". | |
| 3.6 ★ | ☐ | Window B → **Regional Mgr (Vikram)** → Leads → Branch filter. | Branch filter shows **Worli, Andheri, Tardeo** only. Pune URL → 404. Meera's Andheri lead URL → opens. | |
| 3.7 ★ | ☐ | Window B → **Andheri Exec (Arjun)** → Leads. | Default view "My open"; every lead's owner is Arjun. No Branch/Owner filters. | |
| 3.8 ★ | ☐ | Arjun: paste **Meera's lead URL** (a colleague, same branch). | **404 — not found.** | |
| 3.9 | ☐ | Arjun: sidebar. | **No Masters group, no Reports, no Settings, no Team.** No Queues. | |
| 3.10 | ☐ | Arjun: type `/dashboard/masters/users` in the address bar. | Back on the Dashboard with the yellow note "That page isn't available for your role". | |
| 3.11 | ☐ | Window B → **Online Desk (Ananya)** → **Queues**. | Only the **Needs location** tab. Capture an area on a lead → handed over to a branch. After handover she can still open it (read-only: no composer, stage select disabled). | |

---

## 4. Roles & permissions ★

Window A = Super Admin → **Masters → Roles & permissions**.

| # | ☐ | Steps | Expected result | Notes |
|---|---|---|---|---|
| 4.1 | ☐ | Look at the cards. | 5 roles: **Super Admin (Locked)**, Branch Manager, Sales Executive, Online Desk, Management Viewer (Built-in). Each shows scope, # permissions, # users. | |
| 4.2 | ☐ | Click **View** on Super Admin. | Every checkbox ticked and greyed; note says it can't be changed. No Save button. | |
| 4.3 ★ | ☐ | **Clone** on Branch Manager. | New card "Branch Manager (copy)". | |
| 4.4 ★ | ☐ | **Edit** the copy: rename to **Regional Manager**, keep scope **Branch**, untick **Manage users**. Save. | "Role saved". Card shows the new name and one fewer permission. | |
| 4.5 ★ | ☐ | Right panel **Preview as…** → choose **Vikram Sethi**. | "Vikram Sethi (Branch Manager) can see N leads … in Andheri, Tardeo, Worli … and N people", plus the list of what he can do. | |
| 4.6 | ☐ | Preview as **Arjun Nair**. | "… — only their own", small lead count, people = 1. | |
| 4.7 ★ | ☐ | **Permission change without re-login:** Window B logged in as **Andheri Exec** on **Leads** (Export CSV button visible). Window A: edit **Sales Executive**, untick **Export leads**, Save. Window B: click any menu item / refresh. | Arjun's **Export CSV button disappears** — he didn't sign out. Opening `/api/leads/export` returns 403. **Tick Export leads back on** afterwards. | |
| 4.8 | ☐ | Delete the "Regional Manager" role (no users). | Asks to confirm, then gone. Built-in roles have no Delete button. | |
| 4.9 | ☐ | Try to delete **Sales Executive** via its card. | No Delete button (built-in). | |

---

## 5. User management ★

Window A = Super Admin → **Masters → Users**.

| # | ☐ | Steps | Expected result | Notes |
|---|---|---|---|---|
| 5.1 | ☐ | Filters: Branch = Andheri, Role = Sales Executive → Filter. Then Role = Branch Manager. | First: Arjun and Meera. Second: Farah (home Andheri) **and Vikram** (Andheri is one of his extra branches). | |
| 5.2 ★ | ☐ | **Add user**: name `Test Executive`, email `test.exec@elementra.test`, role **Sales Executive**, home branch **Andheri**, reports to **Farah Siddiqui**, Receives new leads ✓. Leave password empty. Create. | Toast: "Test Executive created. Temporary password: Temp-xxxx-Xnn". **Copy it.** Row shows a "Temp password" chip. | |
| 5.3 ★ | ☐ | Window B: log out → log in as `test.exec@elementra.test` with the temporary password. | You land on **"Choose a new password"** (no sidebar). Set `Demo@1234` twice → Dashboard ("My numbers"). | |
| 5.4 | ☐ | Window A: click the **key** icon on Test Executive → confirm. | New temporary password shown in a toast; their next login asks for a new password again. | |
| 5.5 ★ | ☐ | **Anti-escalation:** Window B → **Worli Manager** → Masters → Users → **Add user**. Open the **Role** dropdown. | **Super Admin, Management Viewer, Online Desk** show "(beyond your access)" and can't be picked. **Branch Manager** and **Sales Executive** can. Home branch list = **Worli only**. | |
| 5.6 | ☐ | Worli Manager → edit **Kabir** (himself). | Role dropdown is disabled: "You can't change your own role." No deactivate button on his own row. | |
| 5.7 ★ | ☐ | **Deactivate with hand-over:** Window A → Users → **Meera Joshi** row → red **deactivate** icon. | Dialog: "Meera Joshi has N open leads and N open tasks". Options: **Auto-distribute** or **Give everything to one person**. | |
| 5.8 ★ | ☐ | Choose **Give everything to one person → Arjun Nair** → Reassign and deactivate. | Toast "Meera Joshi deactivated · N lead(s) reassigned". Arjun gets a notification. Open one of those leads: timeline says "Reassigned from Meera Joshi (deactivated) to Arjun Nair by Aarav Mehta." | |
| 5.9 ★ | ☐ | **Deactivated session is rejected:** before 5.8, log Window B in as Meera (`meera@elementra.test`). After 5.8, click anything in Window B. | Window B goes to the login page: "Your account has been deactivated…". Logging in again fails. | |
| 5.10 | ☐ | Users → Status = Deactivated → **reactivate** icon on Meera. | "Meera Joshi can sign in again". Turn **Receives new leads** back on via Edit. | |
| 5.11 | ☐ | **You can't lock yourself out:** as Aarav, Edit your own row. | Role dropdown disabled ("You can't change your own role"); no deactivate icon on your own row. The "last active Super Admin can't be removed" rule is covered by the automated test (`lib/auth/scope.test.ts`), because in the UI only another Super Admin could try it. | |
| 5.12 | ☐ | Masters → Branches → Andheri. | "People" card shows Andheri staff; Vikram listed as "also covers". | |

---

## 6. Pipelines & Statuses (the status master) ★

Window A = Super Admin → **Masters → Pipelines & Statuses**.

| # | ☐ | Steps | Expected result | Notes |
|---|---|---|---|---|
| 6.1 | ☐ | Look at "Sales — Kitchens & Wardrobes" (Default ★). | 15 stages: 1–8 Open, 9 Won, six Lost (10 Budget, 10 Competitor, 11 Timeline, 12 No response, 13 On Hold, 14 Others). Stage 3+ marked "Needs qualification"; Timeline and On Hold marked "Revive date"; Leads column shows counts. | |
| 6.2 ★ | ☐ | **Rename a heading:** click **3. Lead Qualified** → Heading = `3. Qualified – Ready for visit` → Save. Then open **Pipeline**, **Leads** (Stage filter), **Reports** (Report A), **Dashboard** (Open pipeline by stage). | The new heading appears **everywhere** immediately. Old timeline entries still say "Lead Qualified" (history is kept). Rename it back afterwards. | |
| 6.3 ★ | ☐ | **Reorder:** use the ↑ arrow on **5. Quotation Requested** to move it above 4. Check the Pipeline kanban. Move it back. | Kanban column order follows. | |
| 6.4 ★ | ☐ | **Add a column:** **Add stage** → Heading `6a. Revised Quotation Sent`, Type **Open**, Nudge after **3** days → Save. | "6a. Revised Quotation Sent added" — appears after the last open stage; use ↑ twice to place it after "6. Quotation Sent". Kanban shows the new column. | |
| 6.5 ★ | ☐ | **Can't remove a stage that holds leads:** Edit **2. Contacted** → untick **Active** → Save. | Error: "N lead(s) are in "2. Contacted". Merge them into another stage first." The delete icon on that row is disabled. | |
| 6.6 ★ | ☐ | **Merge:** drag one lead into `6a…` on the kanban (or move via its stage dropdown). Back in the master, click the **merge** icon on `6a…` → merge into **6. Quotation Sent**. | "1 lead(s) moved to 6. Quotation Sent; 6a deactivated". The lead's timeline shows "stages merged by Aarav Mehta". Now **delete** `6a…` (no leads left). | |
| 6.7 | ☐ | Validation: edit **9. Closed Won** → untick Active. | "Keep at least one active Won stage." | |
| 6.8 | ☐ | Validation: edit **1. New Lead** → untick "New leads start here". | "Pick one active starting stage for new leads." | |
| 6.9 | ☐ | Edit **6. Quotation Sent**: Nudge after = 3, task = Quotation follow-up. | Shown as "3 d" in the Stale after column. Reminder rule R3 uses it (Automations → Run now creates quotation follow-ups for leads idle 3+ days there). | |
| 6.10 ★ | ☐ | **New pipeline:** Pipelines → **New** → name `Commercial projects` → Save. | Created with New enquiry → Won / Lost. Add a stage. It appears in the kanban **pipeline switcher**. | |
| 6.11 | ☐ | **Duplicate** the Sales pipeline. | "Sales — Kitchens & Wardrobes (copy)" with the same 15 stages. | |
| 6.12 | ☐ | Edit the copy → untick **Active** → Save. Then Edit the **default** pipeline. | Copy is greyed "inactive" and disappears from the kanban switcher and lead forms. The default pipeline has no Active checkbox (it can't be switched off; make another one default first). | |
| 6.13 ★ | ☐ | **Auto-selection by product:** Demo panel → **Full-home enquiry** (scenario 11). Open the lead. | Lead is in **Turnkey / Full Home**, stage **New enquiry**. Timeline: "Pipeline: Turnkey / Full Home (chosen by product)." | |
| 6.14 | ☐ | On that lead, the small **Pipeline:** dropdown under the stage → choose Sales → confirm. | Moves to the matching stage ("1. New Lead / Inquiry"); timeline records the move. | |
| 6.15 | ☐ | **Pipeline** page → switcher → Turnkey / Full Home. Leave and come back to Pipeline. | Your choice is remembered (cookie). | |

Clean-up: delete or deactivate the test pipelines you created.

---

## 7. Sources master ★

Window A → **Masters → Sources**.

| # | ☐ | Steps | Expected result | Notes |
|---|---|---|---|---|
| 7.1 ★ | ☐ | **Add source** → `Housing.com`, pick a colour, key `sheet:Housing.com` → Save. | Row appears, Used by 0. | |
| 7.2 ★ | ☐ | **+ New lead** → Source dropdown. Leads → Filters → Source. | Housing.com in both. | |
| 7.3 | ☐ | Create a lead with source Housing.com. Back on Sources. | Used by 1. Delete icon disabled ("In use — deactivate or merge instead"). | |
| 7.4 ★ | ☐ | Toggle Housing.com **inactive**. Open + New lead and the lead from 7.3. | Gone from the dropdown; the old lead still shows it, greyed "(inactive)". | |
| 7.5 | ☐ | Try to deactivate **Other**. | "Other catches unmapped leads, so it must stay active." | |
| 7.6 | ☐ | **Merge** Housing.com → into **Website**. | "1 lead(s) moved to Website"; Housing.com deactivated; its key now belongs to Website. | |
| 7.7 | ☐ | Add a source with key `meta:ig:paid`. | "Key meta:ig:paid already maps to Instagram (Paid)." | |
| 7.8 | ☐ | ↑/↓ arrows. | Order changes; dropdowns follow the order. | |

---

## 8. Products master ★

Window A → **Masters → Products**.

| # | ☐ | Steps | Expected result | Notes |
|---|---|---|---|---|
| 8.1 ★ | ☐ | **Add product** `Study Units`, key `elementra_study` → Save. | New row. | |
| 8.2 ★ | ☐ | + New lead (product chips), `/enquire` (website form), Leads filter, Pipeline filter. | Study Units is in all of them. | |
| 8.3 | ☐ | Create a lead with Study Units. Products page. | Used by 1; delete disabled. | |
| 8.4 | ☐ | Deactivate it. | Hidden from forms; existing lead shows it greyed. | |
| 8.5 | ☐ | Masters → Pipelines → Turnkey → Edit → auto-select products. | Shows **Full Home Interiors** ticked; any active product can be added. | |

---

## 9. Branches master ★

Window A → **Masters → Branches**.

| # | ☐ | Steps | Expected result | Notes |
|---|---|---|---|---|
| 9.1 | ☐ | First check: **Map → Routing playground** → type `Thane West`. | Goes to **Andheri** (nearest within radius). | |
| 9.2 ★ | ☐ | **Add branch**: code `THN`, name `Thane Experience Centre`, city `Thane`, area `Thane West, 400601`. Click the map near Thane (or type lat `19.2183`, lng `72.9781`), radius `15` → Create. | Page reloads as the new branch; map shows the pin and dashed 15 km circle. | |
| 9.3 ★ | ☐ | Playground again: `Thane West`. | Now goes to **Thane** — routing uses the new branch immediately. | |
| 9.4 | ☐ | On Thane: add pincode rule `400615` (label Ghodbunder). | Chip appears. Playground "400615" → Thane by **pincode rule**. | |
| 9.5 | ☐ | Masters → Users → edit Test Executive → home branch Thane. Playground `Thane West`. | "Next rep: Test Executive". | |
| 9.6 ★ | ☐ | Edit Thane → untick **Active** → Save. Playground `Thane West`. | Back to **Andheri**. | |
| 9.7 | ☐ | Try saving an active Experience Centre without lat/lng. | "An Experience Centre needs a map pin…". | |

---

## 10. Phone number = customer key (no duplicate entries) ★

| # | ☐ | Steps | Expected result | Notes |
|---|---|---|---|---|
| 10.1 ★ | ☐ | Super Admin → open any **open** lead → copy its phone (e.g. `+91 90000 00123`). **+ New lead** → same phone, any name → Save. | Red message: "This number already has an open lead: EL-xxxx (owner, branch). Open it instead of creating a duplicate." with an **Open it** button. **No new lead created.** | |
| 10.2 | ☐ | Same, but type the number differently: `9000000123`, `+91-90000-00123`, `91 90000 00123`. | Same block every time (numbers are normalised). | |
| 10.3 ★ | ☐ | **Andheri Exec**: + New lead with the phone of a **Pune** lead. | "This customer already exists in another branch. The lead's owner and manager have been told." — no details leaked. The Pune owner + Pune manager get a bell notification. | |
| 10.4 ★ | ☐ | Demo panel → **Returning customer** (scenario 8). | Toast "Returning customer → added to EL-xxxx (owner)". **Lead count doesn't increase**; that lead's timeline shows "New enquiry via …" and the owner is notified. | |
| 10.5 | ☐ | Close a lead as Lost. Create a new lead with its phone. | Created normally, marked **Returning customer**, with a link "Earlier enquiry … (stage)". | |
| 10.6 | ☐ | Try to **reopen** that old Lost lead (stage dropdown → an open stage, as Super Admin). | "EL-xxxx is already the open lead for +91…. Close or merge it first." | |
| 10.7 | ☐ | Edit an open lead's phone (Customer & requirement → Edit → Phone) to another open lead's number. | "EL-xxxx is already the open lead for that number." | |
| 10.8 | ☐ | Contacts → add a contact with an existing customer's phone. | Nothing is saved (the database refuses a second contact with that number). **Known rough edge:** this older Contacts form shows the generic "Something went wrong on this page" screen instead of a friendly message. | |

---

## 11. Team performance, audit, nav

| # | ☐ | Steps | Expected result | Notes |
|---|---|---|---|---|
| 11.1 ★ | ☐ | Super Admin → **Insights → Team performance**. | One block per branch (Andheri, Pune, Tardeo, Worli, Online Desk): managers named, team totals, then each person: open leads, new (7 d), first call in SLA %, overdue follow-ups (red), visits, won (30 d, ₹), last sign-in, actions today. | |
| 11.2 | ☐ | Click a person's name. | Audit log filtered to that person. | |
| 11.3 | ☐ | Worli Manager → Team performance. | Only the Worli block. | |
| 11.4 ★ | ☐ | Super Admin → **Audit log**. | Entries for every test above: stage renamed, source added/merged, user created/deactivated (with reassigned lead list), role updated (+/− permissions), pipeline created. | |
| 11.5 | ☐ | **Build Status**. | Grouped by **Week 1 — CRM Foundation … Week 5 — UAT, Training & Go-Live**; Week 1 items Live except **Staging link (In progress)**. | |

---

## 12. Regression — older features still work

| # | ☐ | Steps | Expected result |
|---|---|---|---|
| 12.1 | ☐ | Demo panel → scenarios 1–7, 9, 10. | Same routing as before (Worli, Andheri via fuzzy "goregoan east", Vashi pincode rule → Worli, Pune, Surat out of area, Panvel borderline, needs location → Online Desk, night lead, rep on leave). |
| 12.2 | ☐ | Lead page: log a **Connected** call on a new lead. | Moves to **2. Contacted** automatically. |
| 12.3 | ☐ | Kanban: drag a card forward; drop one on **Lost** → pick **13. Closed Lost – On Hold**. | Revive date asked (pre-filled); saved. |
| 12.4 | ☐ | Drop on **Won** → order value → save. | Deal + project created. |
| 12.5 | ☐ | Appointments → mark a visit **Visited** on an early-stage lead. | Lead moves to **4. Discovery / Requirement Meeting**. |
| 12.6 | ☐ | Automations → **Run now** (twice). | Second run: nothing new (idempotent). |
| 12.7 | ☐ | Queues → Out of area → **Decline politely (WhatsApp) & close** (or **Close without message**). | Lead closed as **14. Closed Lost – Others**; regret WhatsApp in the Inbox (simulator). |
| 12.8 | ☐ | Imports → upload `prisma/fixtures/meta-leads-sample.csv` twice. | First: created; second: all duplicates. |
| 12.9 | ☐ | `/enquire` on a phone-width window → submit. | Thank-you screen; lead appears and is routed. |
| 12.10 | ☐ | Reports → CSV download; Leads → Export CSV. | Files download; export has a Pipeline and Status column. |

---

## 13. Reset after testing

```bash
npm run db:seed:demo   # regenerates the demo leads, tasks and messages (keeps users, masters, settings)
```

`db:seed` never overwrites what an admin changed (renamed stages, sources, roles) — that's deliberate. To get a completely fresh database: `npm run db:reset` (drops everything, re-applies migrations, seeds demo data).

## 14. Reporting a problem

Write: test number (e.g. 6.5) · who you were logged in as · what you clicked · what you expected · what happened · screenshot.
