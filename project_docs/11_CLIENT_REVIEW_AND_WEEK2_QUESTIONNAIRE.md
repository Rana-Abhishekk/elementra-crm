# Elementra CRM — Client Review Pack & End-of-Week-2 Questionnaire

> **For:** Purva (Elementra) · **From:** the Elementra CRM team · **Date:** ___ Nov 2026
> **Staging link:** `https://__________.vercel.app` (shared separately)
>
> **What this document is**
> 1. **Part A — What's ready for your review** and how to test it yourself (about 45 minutes).
> 2. **Part B — Your feedback**: tell us what's missing, wrong or confusing.
> 3. **Part C — Questions for Week 2**: lead qualification, duplicates, chatbot and a few smaller decisions. Your answers decide how we build Week 2.
>
> All names, phone numbers and leads on staging are **dummy data**. Nothing is sent to real customers. WhatsApp, Meta and Google are simulated until your accounts are connected.

---

## Where we are

In the meeting on **28 October** we agreed to build the **user management and role management system first**, together with the Week 1 foundation. That's done:

| Area | Status |
|---|---|
| Secure login, users, roles & permissions, branch-wise visibility | ✅ Ready for review |
| Admin "masters": pipelines & statuses, sources, products, branches | ✅ Ready for review |
| Core CRM: leads, lead page, pipeline board, My Day, appointments, queues, dashboard, reports | ✅ Ready for review |
| Importing leads from a file (Meta Leads Center export) | ✅ Ready for review (CSV files) |
| Phone number as the customer's unique key (no duplicate entries) | ✅ Ready for review |
| Lead qualification scoring | ⏳ Week 2 — **needs your answers (C1)** |
| Duplicate review screen (merge two leads) | ⏳ Week 2 — **needs your answers (C2)** |
| Chatbot (website + WhatsApp) | ⏳ Week 2 — **needs your answers (C3)** |
| Real WhatsApp / Meta / Google Sheets / Google Maps | 🔒 Week 3 — needs your account access |

The **Build Status** page inside the app (sidebar → Admin → Build Status) shows the full list, week by week, with honest labels.

---

## Part A — How to review the application

### A0. Signing in

Open the staging link. On the login page, use the **Demo quick login** buttons (password for all: `Demo@1234`):

| Button | Person | Role | Sees |
|---|---|---|---|
| Super Admin | Aarav Mehta | Super Admin (owner) | Everything, every branch |
| Worli Manager | Kabir Malhotra | Branch Manager | Worli only |
| Regional Mgr | Vikram Sethi | Branch Manager over 3 branches | Worli, Andheri, Tardeo |
| Pune Manager | Sneha Kulkarni | Branch Manager | Pune only |
| Online Desk | Ananya Rao | Online Desk (pre-sales) | Her leads + leads without a location |
| Andheri Exec | Arjun Nair | Sales Executive | Only his own leads |
| Pune Exec | Omkar Patil | Sales Executive | Only his own leads |

**Tip:** open a second browser window in Incognito mode so you can be Super Admin in one window and someone else in the other.

### A1. User management (≈ 8 min)

Sign in as **Super Admin** → sidebar **Masters → Users**.

| # | Try this | You should see |
|---|---|---|
| 1 | **Add user**: a name, an email ending in `@elementra.test`, role *Sales Executive*, home branch *Andheri*, reports to *Farah*. Leave the password empty and click Create. | A temporary password appears. Copy it. |
| 2 | In the Incognito window, sign in as that new user with the temporary password. | You're asked to choose your own password before anything else. |
| 3 | Back as Super Admin, edit the user: change the home branch, add an extra branch, turn "Receives new leads" off and on. | Saved; a "temporary password" tag shows until they change it. |
| 4 | Click the red **deactivate** icon on an executive, e.g. Meera. | The dialog shows how many open leads and tasks she has, and asks who takes them over (one person, or shared round-robin in the branch). **You can cancel here.** |
| 5 | Sign in as **Worli Manager** → Masters → Users → Add user → open the Role list. | He can only create Branch Managers or Sales Executives, and only in Worli. Super Admin is locked for him. |

### A2. Roles & permissions (≈ 7 min)

Super Admin → **Masters → Roles & permissions**.

| # | Try this | You should see |
|---|---|---|
| 1 | Look at the 5 role cards. | Super Admin (locked), Branch Manager, Sales Executive, Online Desk, Management Viewer. |
| 2 | **Clone** Branch Manager → **Edit**: rename it (e.g. "Regional Manager"), look at "Which records can they see?" (Own / Branch / All) and the permission checkboxes. Save. | Your own role, built from checkboxes. |
| 3 | **Preview as…** → pick Vikram Sethi. | Exactly how many leads and people he can see, in which branches, and what he can do. |
| 4 | Incognito: sign in as **Andheri Exec** → Leads (note the *Export CSV* button). Super Admin window: edit **Sales Executive**, untick *Export leads*, Save. Incognito: click Leads again. | The Export button is gone, without him signing out. **Tick it back on afterwards.** |
| 5 | Delete the role you created in step 2. | Gone. Built-in roles can't be deleted. |

### A3. Branch-wise visibility (≈ 6 min) — "Worli can't see Pune"

| # | Try this | You should see |
|---|---|---|
| 1 | Super Admin → **Leads → All** → set the Branch filter to *Pune* → open any lead → copy the link from the address bar. | — |
| 2 | Incognito → **Worli Manager** → Leads. | Only Worli leads. Masters → Users shows only Worli people. Dashboard and Reports show Worli numbers only. |
| 3 | Still Worli Manager → paste the Pune lead link. | **"This page could not be found."** Even with the exact link, he can't open it. |
| 4 | Incognito → **Regional Mgr (Vikram)** → Leads → Branch filter. | Worli, Andheri and Tardeo only. |
| 5 | Incognito → **Andheri Exec (Arjun)** → Leads. | Only his own leads; a colleague's lead link is "not found". |
| 6 | Super Admin → **Insights → Team performance**. | Every branch and every person: open leads, first call on time, overdue follow-ups, visits, wins, last sign-in, activity today. |

### A4. Pipelines & statuses — "the admin decides the statuses" (≈ 8 min)

Super Admin → **Masters → Pipelines & Statuses**.

| # | Try this | You should see |
|---|---|---|
| 1 | Look at "Sales — Kitchens & Wardrobes". | Your 14 statuses from the Sales Pipeline sheet (the lost reasons are their own stages). |
| 2 | Click **3. Lead Qualified** and rename it. Then open **Pipeline** from the sidebar. | The column has the new name, and so do the lead badges, filters, reports and dashboard. Rename it back afterwards. |
| 3 | **Add stage** (e.g. "6a. Revised Quotation Sent", Open, nudge after 3 days). Use the ↑ arrows to place it after stage 6. | A new column on the Pipeline board. |
| 4 | Try to switch off a stage that has leads in it (Edit → untick Active). | Blocked: you're asked to move ("merge") its leads into another stage first, so no lead is ever lost. |
| 5 | Open **Turnkey / Full Home** in the pipeline list. | A second pipeline with its own stages. Leads that include *Full Home Interiors* start here automatically. |
| 6 | On the **Pipeline** board: use the search box, the pipeline switcher, and the Branch / Owner / Product filters. Drag a card to the next column; drop one on **Lost**. | Card moves; Lost asks for the reason (and a revive date for On Hold / Timeline). |

### A5. Sources, products, branches (≈ 6 min)

| # | Try this | You should see |
|---|---|---|
| 1 | **Masters → Sources → Add source** "Housing.com". Then **+ New lead** → Source list. | Housing.com is there. Switch it off → gone from the list, but old leads still show it (greyed). |
| 2 | **Masters → Products → Add product**. Open the public enquiry form at `/enquire`. | The new product appears on the form. |
| 3 | **Map → Routing playground** → type "Thane West". | Goes to Andheri today. |
| 4 | **Masters → Branches → Add branch**: "Thane Experience Centre", click the map near Thane, radius 15 km → Create. Playground "Thane West" again. | Now goes to Thane. Switch the branch off afterwards → back to Andheri. |

### A6. No duplicate entries — phone number as the customer key (≈ 4 min)

| # | Try this | You should see |
|---|---|---|
| 1 | Open any open lead, copy its phone number. **+ New lead** with the same number (type it without +91, or with spaces). | "This number already has an open lead: EL-xxxx … Open it." No second lead is created. |
| 2 | As **Andheri Exec**, try the phone number of a Pune lead. | "This customer already exists in another branch." The Pune owner and manager are notified. No details are shown to Arjun. |
| 3 | Super Admin → gold **Demo** button → **Returning customer**. | The new enquiry is added to the existing lead's history instead of creating a duplicate. |

### A7. Importing leads from a file (≈ 3 min)

Super Admin → **Admin → Imports**.

| # | Try this | You should see |
|---|---|---|
| 1 | Upload a **Meta Leads Center CSV export** (we can send you a sample file). | A preview, then the import. Every row is routed and assigned like a live lead; a duplicate report at the end. |
| 2 | Upload the same file again. | Nothing is imported twice. |

> **Note:** imports take **CSV** files today. From Excel, use *File → Save As → CSV*. Importing your current *Sales Pipeline* sheet needs agreed cleaning rules (two numbers in one cell, remarks history); see C5.

### A8. Everyday work (optional, ≈ 5 min)

As **Andheri Exec**: **My Day** (overdue / today / upcoming tasks, Call / WhatsApp buttons), open a lead → log a call → set a follow-up → book a showroom visit. As Super Admin: **Dashboard**, **Reports** (your three Excel pivots, live), **Automations → Run now**.

---

## Part B — Your feedback

Please fill in as you go (or send screenshots on WhatsApp with the step number).

| # | Screen / step (e.g. A4-3) | What's wrong, missing or confusing | How important? (Must / Should / Nice) |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

**Quick checks — tick what's right, correct what's not:**

- ☐ The **roles** are right: Super Admin, Branch Manager, Sales Executive, Online Desk, Management Viewer. Missing roles (e.g. Designer, Accounts, Site Supervisor)? __________
- ☐ The **branches** and who manages which (any regional managers?): __________
- ☐ The **14 statuses** and their order are right. Changes: __________
- ☐ The **Turnkey / Full Home** stages are right (New enquiry → Site visit & measurement → Design presentation → Proposal sent → Negotiation → Advance received → Won / Lost). Changes: __________
- ☐ The **sources** list is complete. Add: __________
- ☐ The **products** list is complete. Add: __________
- ☐ What a **Branch Manager** may do (reassign, export, reopen closed leads, manage their team's logins) is right. Changes: __________
- ☐ **Sales Executives** should be allowed to export their own leads: Yes / No

---

## Part C — Questions for Week 2

### C1. Lead qualification — what makes a lead "qualified"?

Today a salesperson moves a lead to "3. Lead Qualified" by hand. For Week 2 we propose a **qualification score (0–100)** that the system works out by itself, and a rule that a lead **can't move past "Lead Qualified" until the must-have items are known**. Managers could override with a reason.

**Our proposal — please change the ticks and weights:**

| Item | Weight | Must-have to be "qualified"? | Your answer |
|---|---|---|---|
| Site location known and inside your service area | 25 | ✅ | |
| At least one product selected | 15 | ✅ | |
| Customer actually reached (connected call, WhatsApp reply, or completed chatbot) | 15 | ✅ | |
| Possession / start timeline known | 15 | — | |
| Budget known and above a minimum | 15 | — | |
| Property type or BHK known | 5 | — | |
| Architect / decision-maker known | 10 | — | |

1. Are these the right items? What else does your team check before calling a lead "qualified" (e.g. carpet area, kitchen size, floor plan received, family decision-maker met)?
2. Which items are **must-haves**?
3. What is the **minimum budget** you'd take on? Please give your **budget bands** (we assumed: below ₹3 L · ₹3–6 L · ₹6–10 L · ₹10–20 L · ₹20–35 L · ₹35 L+).
4. **Possession timeline** options (we assumed: ready / moved in · within 3 months · 3–6 months · 6–12 months · more than 12 months · not sure). Correct?
5. **Hot / Warm / Cold**: should the system set it from the score (e.g. Hot = score ≥ 75 and possession within 3 months; Warm = score ≥ 45; Cold = the rest), or should salespeople always choose?
6. **Blocking:** should an unqualified lead be **blocked** from moving forward, or only **warned**? Who may override (managers only)?
7. Should the system **suggest** closing a lead (e.g. budget too low → "Closed Lost – Budget"; outside service area → "Closed Lost – Others")? We would never close a lead automatically.
8. Property types (apartment, villa / bungalow, row house, office / commercial) and BHK (1, 2, 3, 4+): anything to add?

### C2. Duplicate handling — phone number as the key

**What we built (already in the application):** the phone number is the customer's **unique key**. The system cleans up every format (`9000012345`, `+91 90000 12345`, `91-90000-12345` are the same number), and the database itself refuses:
- a second **customer record** with the same number, and
- a second **open lead** with the same number.

**About making the phone number the "primary key":** as you noted, a primary key usually appears in page addresses (URLs). Using a personal phone number there would expose it in links, browser history and server logs, which isn't good practice even if it isn't a compliance issue today (it becomes one once payment systems are involved). So we did what you recommended:
- Every record has an **internal random ID** (not the phone number), and that ID is what appears in links, e.g. `/dashboard/leads/cmvuhe…`. **Lead links never contain a phone number.**
- The phone number carries a **unique constraint** in the database. That gives the same "no duplicates" guarantee, and it's ready for payment integration later without changes.
- One small exception: when someone **searches by phone number**, the search text appears in the address bar (`?q=90000…`), the same as on most websites. If you want, we can change search so the number is never in the address. *Should we? Yes / No*

**Questions:**
1. When the same customer enquires again **while their lead is still open** (e.g. a second Instagram form), we **add the new enquiry to the existing lead** and tell its owner. No second lead. Is that right?
2. When a customer **comes back after their lead was closed** (won or lost), we create a **new lead** marked "Returning customer", linked to the old one. Should it go back to the **same salesperson** if they're still with you, or be assigned fresh by area?
3. Should **email** also count as a duplicate match (same email, different phone)?
4. Families often enquire from **two different numbers**. Should we flag "possible duplicate" when the name and area match within 30 days, for a manager to review and merge?
5. If someone in **another branch** tries to add an existing customer, we say "exists in another branch" and notify the owner and their manager. Should that person be allowed to see who the owner is?
6. Who may **merge** two leads: managers only, or the Online Desk too?
7. Customers who give **two numbers in one cell** (common in your current sheet): should the second number be stored as an alternate number and also count for duplicate checks? (We assume yes.)

### C3. Chatbot — which kind do you want?

There are two common kinds of chatbot. Please tell us which you mean, or a mix.

**Type 1 — Guided chatbot with buttons (what we recommend for Week 2).**
The bot asks set questions; the customer taps an option or types a short answer; the bot **does things** with the answers. Example on WhatsApp or the website:

> **Bot:** Hi! 👋 Welcome to Elementra. What are you looking for? 1 Kitchen · 2 Wardrobes · 3 Full home
> **Customer:** 1, 2
> **Bot:** Where is your site? (pincode or area)
> **Customer:** goregaon east
> **Bot:** When do you get possession? Within 3 months · 3–6 months · Later
> **Customer:** Within 3 months
> **Bot:** Would you like to visit our Andheri Experience Centre? This week · Next week · Just call me
> **Customer:** This week
> **Bot:** Thank you! Arjun from our Andheri Experience Centre will call you shortly.

Behind the scenes it **creates the lead**, routes it to the right branch and salesperson, fills in the qualification answers, and creates a "customer wants a showroom visit this week — call to book" task. It can also **book a showroom slot directly** if you want (see question 4). Typing "agent" or "call me" hands the chat to a person. English and Hindi.

**Type 2 — Question-and-answer chatbot (FAQ bot).**
The customer types any question ("Do you do modular kitchens in Pune?", "What's your warranty?") and the bot replies from a list of questions and answers you give us. It **doesn't create leads or book anything** by itself; it just answers.

**Type 3 — AI chatbot** that understands free text and answers anything. This was **outside the original proposal** (AI was excluded) and would be a separate add-on.

**Questions:**
1. Which type: **1 (guided, takes actions)**, **2 (FAQ answers)**, or **1 + a few FAQ buttons** (e.g. "Warranty", "Showroom timings", "Price range")?
2. Which **questions should the bot ask**, in what order? Please share the questions your Online Desk asks on the first call.
3. Where should it run: **website chat** (available on staging in Week 2), **WhatsApp** (simulated until Meta approves your WhatsApp Business number), or both?
4. **Showroom visits:** should the bot only **request** a visit (your team calls to confirm) or **book an actual slot** (showroom timings, slot length, how many visits per slot, blocked days)?
5. Which **languages**: English and Hindi? Marathi?
6. **Opening hours:** outside working hours, should the bot still collect details and promise a call the next morning?
7. If you choose FAQ buttons, please send the **questions and answers** (warranty, materials, delivery time, price ranges you're comfortable sharing, showroom addresses and timings).
8. When should a **person take over** (customer asks, bot doesn't understand twice, price questions)? Who gets notified?
9. If the customer goes quiet, should the bot send **one reminder** after 30 minutes? After 24 hours we'd close the chat and still create the lead if we know the area.

### C4. Smaller decisions

1. **Staging access:** who on your side needs a login (name, email, role, branch)? We'll create real logins with temporary passwords. The demo buttons will be switched off before real data goes in.
2. **Branches:** confirm exact showroom locations (map pins), service radius, and which pincodes always belong to which branch (we assumed Navi Mumbai → Worli).
3. **Working hours and first-call promise:** we assumed 10:00–19:30, 7 days, first call within 60 working minutes, escalate to the manager after 4 hours. Correct?
4. **Notifications:** should managers get a morning summary by email as well as in the app?
5. **Lost reasons:** should "Closed Lost – Others" always ask for a note?

### C5. What we need from you for Weeks 3–5

| Item | Why | Who |
|---|---|---|
| Meta Business Manager admin access + Facebook Page | Receive Instagram / Facebook leads live | Purva |
| WhatsApp Business number + Meta business verification (takes 7–21 days, **please start now**) | Real WhatsApp messages and the WhatsApp chatbot | Purva |
| Google Cloud project + Maps API key | Better address matching | Purva |
| Access to the live Google Sheet | Sheet sync | Purva |
| Your latest Sales Pipeline sheet + agreement on cleaning rules | Importing your existing leads | Purva + us |
| Vercel and Neon accounts in Elementra's name (or approval to keep them under ours) | Staging now, production later | Purva |

---

**Please send your answers by: ____________.** Week 2 build starts as soon as C1 (qualification) and C3 (chatbot) are answered.
