# Elementra CRM — Week 1 Demo Guide ("CRM Foundation")

> **Use this for the End-of-Week-1 review with the client.** It shows what they asked for in the 28 Oct meeting — *the admin controls the statuses, sources, products, branches, users and roles; Worli's manager can't see Pune; executives can't see each other's leads; the super user sees every manager* — plus the core lead flow and "no duplicate entries".
> **Length:** 20–25 minutes + questions. A 10-minute short version is at the end.
> **Replaces** the chip names in `05_DEMO_REHEARSAL_GUIDE.md`: **Owner → Super Admin**, **Andheri Rep → Andheri Exec**. The rest of 05 (routing, reminders, pipeline) still works as written.

---

## Part 1 — The three things they must leave believing

1. **"We run the system, not the developer."** Statuses, columns, sources, products, branches, users and permissions are changed by our admin, on screen, and the whole app follows instantly.
2. **"Everyone sees only what they should."** Worli ≠ Pune, an executive ≠ a colleague, the owner sees everything — enforced by the server, not just hidden buttons.
3. **"The same customer can't be entered twice."** The phone number is the customer's key.

---

## Part 2 — Setup (30 minutes before)

| ☐ | Item | Why |
|---|---|---|
| ☐ | `npm run db:up` → `npx prisma migrate deploy` → `npm run db:seed` → `npm run db:seed:demo` → `npm run dev:all` | Fresh demo data (~180 leads), app + reminder runner |
| ☐ | **Window A** (normal Chrome) → `localhost:4610/login` → chip **Super Admin** | Main presenting window |
| ☐ | **Window B** (second Chrome profile or Incognito) → chip **Worli Manager** | For the "who sees what" part |
| ☐ | Window A: open **Masters → Pipelines & Statuses** once, **Map** once, **Team performance** once | First loads compile in dev mode; later clicks are instant |
| ☐ | Make sure stage 3 is called **"3. Lead Qualified"** and there's no "Thane" branch or "Housing.com" source left from rehearsal | Clean starting point |
| ☐ | Zoom browser to 110–125% | Readable on a projector |
| ☐ | Phone on the same Wi-Fi, `http://<laptop-ip>:4610/enquire` open (optional) | Mobile moment |

**Logins** (password `Demo@1234` for all): Super Admin (Aarav) · Online Desk (Ananya) · Worli Manager (Kabir) · Regional Mgr (Vikram) · Pune Manager (Sneha) · Andheri Exec (Arjun) · Pune Exec (Omkar).

---

## Part 3 — Opening (45 seconds, no clicking)

> "Last week you told us four things: the admin should decide the statuses for everyone, you want masters for sources, products and branches, a user and role system where Worli's manager can't see Pune and executives can't see each other's leads, and the same customer should never be entered twice. That's what Week 1 delivers, on top of the lead flow you've seen. Everything you'll see is dummy data; your real leads come in at go-live."

---

## Part 4 — The demo

### Step 1 — The Super Admin's morning (1.5 min) · Window A

**Click:** Dashboard.
**Point at:** KPIs, *Overdue follow-ups by person*, *Open pipeline by stage*.
> "Aarav is the **Super Admin** — the owner. He sees every branch. Every number here respects who's looking; in a minute you'll see a branch manager get only his branch."

**Click:** sidebar → show the new **Masters** group.
> "This is the admin's control room: Pipelines & Statuses, Branches, Sources, Products, Users, Roles."

### Step 2 — The status master: admin decides the stages (3 min) · Window A

**Click:** Masters → **Pipelines & Statuses**.
> "These are your 14 statuses, exactly as in your sheet — 1 to 9, and the lost reasons 10 to 14 as their own stages. Colours, which ones are Won or Lost, which ones ask for a revive date, and after how many idle days we nudge the salesperson."

**Do — rename a heading:** click **3. Lead Qualified** → change to `3. Qualified – Ready for visit` → **Save stage**.
**Click:** **Open kanban →**.
> "The column is renamed for everyone, instantly. Same in the lead badges, filters, reports and the dashboard. And the history isn't rewritten — old timeline entries still say what the stage was called at the time."

**Do — add a column:** back to the master → **Add stage** → `6a. Revised Quotation Sent`, Open, nudge after `3` days → Save → press **↑** twice so it sits after "6. Quotation Sent" → **Open kanban →**.
> "A new column, no developer. If you ever stop using a stage that has leads in it, the system won't let you lose them — you merge its leads into another stage first."

**Show (don't click):** the merge icon and the greyed delete icon on a stage with leads.

**Click:** **Turnkey / Full Home** in the pipeline list.
> "You can also have more than one pipeline. This one is for full-home projects, with its own stages. Any lead that includes *Full Home Interiors* starts here automatically."

**Do:** Demo panel (gold **Demo** button) → **Full-home enquiry** → open the new lead.
> "Website enquiry, Full Home + Kitchen — it landed in the Turnkey pipeline, first stage, and routed to the right branch."

**Reset:** rename stage 3 back to "3. Lead Qualified" later (Part 7), or leave it if they like it.

### Step 3 — Sources and products masters (2 min) · Window A

**Click:** Masters → **Sources** → **Add source** → `Housing.com` → key `sheet:Housing.com` → Save.
**Click:** **+ New lead** → open the **Source** dropdown.
> "It's there for everyone. Each source can carry keys that map incoming data automatically — 'Instagram Paid Media' from your sheet, the Instagram paid flag from Meta. If something unknown comes in, it's filed under *Other* and flagged here so you can map it."

**Show:** the **Used by** column; toggle Housing.com **inactive** → back to + New lead → it's gone.
> "Deactivate instead of delete: old leads keep showing it, greyed. Or merge it into another source and all its leads move."

**Click:** Masters → **Products** → show the list, *Used by* counts.
> "Same for products. Add one here and it appears on the lead form, the website enquiry form, filters and reports."

### Step 4 — Branch master: a new showroom changes routing immediately (2 min) · Window A

**Click:** **Map** → Routing playground → type `Thane West`.
> "Today a Thane West enquiry goes to Andheri — the nearest showroom."

**Click:** Masters → **Branches** → **Add branch** → code `THN`, name `Thane Experience Centre`, city `Thane` → click the map on Thane (or lat `19.2183`, lng `72.9781`) → radius `15` → **Create branch**.
**Click:** Map → playground → `Thane West`.
> "The moment the branch exists, Thane leads go there. Pincode rules, radius and round-robin vs fewest-open-leads are set per branch here too."

**Do:** Masters → Branches → Thane → untick **Active** → Save (clean-up).

### Step 5 — Who sees what (4 min) · Windows A and B ★ the key moment

**Window A (Super Admin):** Leads → All → filter Branch = **Pune** → open a lead → copy the URL.

**Window B (Worli Manager — Kabir):** Leads.
> "Kabir runs Worli. He sees Worli's leads and Worli's people — nothing from Pune, Andheri or Tardeo."

**Window B:** paste the Pune lead URL.
> "Even with the exact link, the system says it doesn't exist. That check is on the server — hiding a button isn't security."

**Window B:** Masters → **Users**.
> "And only his own team."

**Window B:** log out → **Regional Mgr (Vikram)** → Leads → open the Branch filter.
> "Vikram is a regional manager over Worli, Andheri and Tardeo — three branches, still no Pune. One person, one role, several branches."

**Window B:** log out → **Andheri Exec (Arjun)** → Leads.
> "Executives see only their own leads. Arjun can't open Meera's lead, even though they sit in the same showroom."

**Window A:** Insights → **Team performance**.
> "And the super user sees every manager and every person: open leads, first call within the promise, overdue follow-ups, visits, wins, last sign-in, what they did today. Click a name to see their activity trail."

### Step 6 — Roles & users: IAM, but simple (3 min) · Window A

**Click:** Masters → **Roles & permissions**.
> "A role is two things: what you can **see** — your own, your branch, or everything — and what you can **do** — these checkboxes."

**Do:** **Clone** Branch Manager → Edit → name `Regional Manager` → show the scope cards and grouped checkboxes → Save.
> "Make your own roles. The system won't let anyone give out more power than they have themselves, and the Super Admin role is locked so you can never lock yourselves out."

**Do:** **Preview as…** → Vikram Sethi.
> "Before you change anything, preview exactly what someone will see."

**Live permission change (optional, impressive):** Window B as Andheri Exec on **Leads** (Export CSV visible). Window A: Roles → Sales Executive → untick **Export leads** → Save. Window B: click **Leads** again → the button is gone.
> "No sign-out needed — it applies on their next click. Same if you deactivate someone: they're out on their next click."
**Undo:** tick Export leads back.

**Click:** Masters → **Users** → **Add user** (show the form, don't necessarily save) → role, home branch, *also covers*, reports to, receives leads.
> "New staff get a temporary password and must choose their own at first sign-in."

**Click:** red **deactivate** icon on any executive (**don't confirm**) → show the dialog.
> "When someone leaves, their open leads and tasks are handed over first — to one person or spread round-robin — so nothing is dropped."

### Step 7 — No duplicate entries (2 min) · Window A

**Click:** open any open lead → copy the phone → **+ New lead** → same phone (type it as `90000 xxxxx`, no +91) → any name → Save.
> "The phone number is the customer's key. The system recognises it in any format and sends you to the existing lead instead of creating a second one."

**Do:** Demo panel → **Returning customer**.
> "If the same customer fills in another Instagram form, it doesn't create a duplicate — the new enquiry is added to the existing lead and the owner is told. If someone in another branch tries to add them, they're told the customer exists — without seeing the details — and the owner is notified."

### Step 8 — The lead flow still works (2 min, optional if time) · Window A

Use `05_DEMO_REHEARSAL_GUIDE.md` steps 2–4 in short: Demo panel → **Instagram ad — Worli flat** → open lead → "Why this branch" card; **Misspelt suburb**; **Out of area — Surat**.

### Step 9 — Close on Build Status (45 s) · Window A

**Click:** **Build Status**.
> "Your five-week plan, honestly marked. Week 1 — the CRM foundation — is live: login, roles and permissions, branch segregation, all the masters, no-duplicates. The staging link goes up as soon as we have the Vercel and Neon access. Week 2 is lead logic and the chatbot: qualification scoring, the duplicates review screen, and the WhatsApp/website chatbot."

---

## Part 5 — The ask (2 minutes)

1. **Staging:** access to a Vercel account and a Neon database (or let us create them in your name) → we publish the review link.
2. **Confirm** the role list: Super Admin, Branch Manager, Sales Executive, Online Desk, Management Viewer — anything missing (e.g. Designer, Accounts)?
3. **Confirm** who manages which branches (regional managers?).
4. **Confirm** the statuses and the Turnkey pipeline stages, and any sources/products to add (Housing.com, exhibitions…).
5. **Week 2 input:** the questions the Online Desk asks today (for the chatbot) and what "qualified" means to them (budget, possession, location, contact reached).

---

## Part 6 — Cheat sheet (keep on your phone)

| # | Where | What to do |
|---|---|---|
| 1 | Dashboard | Super Admin, Masters group |
| 2 | Masters → Pipelines | Rename stage 3 → kanban; Add stage 6a (↑↑); Turnkey; Demo → Full-home enquiry |
| 3 | Masters → Sources / Products | Add Housing.com → + New lead dropdown → deactivate |
| 4 | Map → playground | Thane West → Andheri; add Thane branch → Thane; deactivate |
| 5 | Window B | Worli Mgr (Pune URL → 404, Users) → Vikram (3 branches) → Andheri Exec |
| 5b | Team performance | Every branch & person |
| 6 | Roles | Clone → Regional Manager; Preview as Vikram; untick Export live |
| 7 | + New lead | Existing phone → blocked; Demo → Returning customer |
| 9 | Build Status | Week 1 live; staging + Week 2 next |

---

## Part 7 — After the demo: reset

- Masters → Pipelines: rename stage 3 back; merge/delete "6a…" (no leads → delete icon).
- Masters → Sources: Housing.com → Merge into Other or delete (if unused).
- Masters → Branches: Thane inactive (or leave).
- Roles: delete "Regional Manager" (no users).
- Demo panel → **Reset demo data** (keeps masters, users and settings).

---

## Part 8 — Don't click these in front of the client

| Don't | Why |
|---|---|
| Delete buttons, **Duplicate pipeline** | They open a browser "Are you sure?" box — fine, but it looks clunky on a projector and wasn't rehearsed. |
| **Confirm** the Deactivate dialog on a real demo person | Works, but reassigns all their leads — you'd have to reactivate and the demo data looks different afterwards. |
| Contacts → add a contact with an existing phone | The older Contacts form shows a generic error screen (nothing is saved). |
| Settings → Duplicates expecting the old "Link / Warn" options | Replaced by the phone-key rule (one open lead per number); the page explains it. |
| Qualification score, duplicates review queue, chatbot | Week 2 — not built yet (Build Status says so). |
| Google Maps / real WhatsApp / real Meta | Still simulated until the client's accounts are connected. |

---

## Part 9 — If something goes wrong live

| Problem | Fix | Say |
|---|---|---|
| A page shows an error right after a deploy/restart | Refresh once (dev mode compiles on first open) | "First load after a restart." |
| A master change doesn't show | Refresh the other window | "Other screens update on the next click." |
| Window B logged in as the wrong person | Sign out (sidebar bottom) → chip | — |
| Demo data looks odd after rehearsal | Demo panel → Reset demo data | "Fresh data." |

---

## Short version (10 minutes)

Step 2 (rename stage 3 + add a column) → Step 5 (Worli Manager: Pune URL → not found; Andheri Exec; Team performance) → Step 6 (Preview as Vikram) → Step 7 (duplicate phone blocked) → Step 9 (Build Status).
