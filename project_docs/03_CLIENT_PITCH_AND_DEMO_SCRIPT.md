# Elementra CRM — Progress Demo: Pitch, Talk Track & Status Board

> **For:** Rana (presenter). **Meeting length:** ~30 min (2 min opener · 15 min live demo · 8 min status & decisions · 5 min next steps).
> **Tone:** same as the proposal: plain, honest, no jargon.
> **Before the meeting:** open the app's **Build Status** page and reconcile it with the board in Part D. If anything listed as "Working" isn't working in your build, downgrade it here. Never claim more than the app shows.

---

## Part A — The one-minute opener

> "When we last spoke, the real problem was clear: leads come from many places, nobody is sure who owns them, out-of-area enquiries waste time, and follow-ups depend on memory. You don't need software for the sake of software — you need a sales desk that doesn't leak.
>
> Today we'll show you the CRM running on a real database. A lead comes in, the system reads where the site is, sends it to the right Experience Centre, gives it to a person, and then keeps reminding that person until the lead is closed — won or lost. We'll also show you what's still being built, clearly marked, so you know exactly where we are.
>
> Everything you'll see uses dummy customers. Your real data comes in at go-live."

---

## Part B — What you told us → what you'll see today

| Your problem | What you'll see in the demo |
|---|---|
| Leads come from Instagram, Facebook, WhatsApp, website, calls, walk-ins — in different places | One **Leads** list. Every lead shows its source, campaign and ad. |
| Nobody is sure who owns a lead | The moment a lead arrives it has **a branch and a person**, plus a **"Why this branch"** card explaining the decision |
| Out-of-area leads waste time | Surat, Hyderabad and Panvel enquiries are **caught and parked** in a manager queue, with the distance shown |
| People type locations wrongly ("Borivalli", "Goregoan") | The system **understands spelling mistakes** and pincodes |
| The Instagram form doesn't ask for location | No-location leads go to the **Online Desk queue**. When they type the area, the lead **hands over automatically** to the right branch. |
| Follow-up depends on memory; many leads end as "No response" | Every lead has a **next follow-up**. The server **reminds and escalates**, even when nobody is logged in. |
| Showroom visit reminders are typed by hand every time | **Appointment reminders** go out automatically on WhatsApp (in English or Hindi) |
| The owner has no live picture | **Dashboard** + your own Excel pivots, **always up to date** |
| Remarks are one long cell | A clean **timeline**: calls, WhatsApps, visits, stage changes, who did what and when |

---

## Part C — Live demo talk track (15 minutes)

> Setup: run `npm run db:reset` an hour before, keep `npm run dev:all` running, log in as **Owner (Aarav)**, and have a phone ready (or browser dev-tools at phone width). Close other tabs.
> Format: **Click** = what you do · **Say** = what you say · **If asked** = ready answers.

### 1. The owner's morning (2 min)
**Click:** Dashboard.
**Say:** "This is what you see in the morning. New leads, how many haven't been called yet, overdue follow-ups, out-of-area enquiries, showroom visits booked, and the value in the pipeline. This chart shows overdue follow-ups by person, so you know who to nudge without asking anyone."
**If asked "Is this real data?":** "It's dummy data shaped like your sheet: same stages, same sources, same branches. At go-live we import your real leads."

### 2. A lead arrives from Instagram (2 min)
**Click:** Demo panel → "Instagram ad — Worli flat". Watch the toast and the bell.
**Say:** "A lead just came from your Instagram ad. Look: it already has a branch, Worli, and a person. The customer has also got a welcome message on WhatsApp."
**Click:** open the lead → point at the **Why this branch** card, then the timeline.
**Say:** "Nobody has to decide anything. And if you ever ask 'why did this go to Worli?', the answer is written here."

### 3. Spelling mistakes and pincode rules (2 min)
**Click:** "Misspelt suburb" → show `goregoan east → Goregaon East → Andheri, 4.4 km`.
**Say:** "Your sheet has entries like 'Borivalli' and 'Goregoan'. The system still understands them."
**Click:** "Navi Mumbai pincode rule" → show Worli by rule, with Andheri slightly nearer.
**Say:** "If you decide 'all Navi Mumbai goes to Worli', that's a rule. The rule wins over distance. You decide the rules; the system follows them."

### 4. Out of area and borderline (1.5 min)
**Click:** "Out of area — Surat", then "Borderline — Panvel" → Queues → Out of area.
**Say:** "Surat is 226 km away, so it's parked here, not dumped on a busy executive. Panvel is just outside your 30 km Worli radius. A manager can accept it in one click, or the system can send a polite 'we don't serve this area yet' message. You choose which."
**Click:** Accept Panvel for Worli.

### 5. Leads without a location (1.5 min)
**Click:** "No location (typical Meta form)" → Queues → Needs location. Switch user to **Online Desk (Ananya)**.
**Say:** "Your Instagram form asks for product, name, email and phone, but not where the site is. So these come to your Online Desk. She calls, types 'Borivalli west'…"
**Click:** type it and save → toast "Handed over to Andheri → …".
**Say:** "…and it's handed over to Andheri instantly. No WhatsApp forwarding, no 'Handed over to' column."
**Tip to share:** "Add one question, 'Site pincode', to your Instagram form, and most leads will route themselves with no call needed."

### 6. Someone is on leave (1 min)
**Click:** "Rep on leave".
**Say:** "Arjun is on leave today, so the system skips him and gives the lead to Meera. When he's back, he's in the rotation again. That's the team side: who's in which branch, who's available, how many open leads each person has."
**Click:** Team page → show the on-leave toggle and the load columns.

### 7. The reminder robot (2.5 min)
**Click:** switch to **Andheri rep (Arjun)** → My Day.
**Say:** "This is what a salesperson sees: overdue, today, upcoming. They open a lead, log 'no answer', set 'call tomorrow', and it moves. Nothing depends on memory."
**Click:** log a call "No answer" → set follow-up "Tomorrow".
**Click:** Automations page → show the rule cards.
**Say:** "These run on the server, even at night and even if every laptop is closed. A new lead not called within an hour alerts the person; after four hours, the branch manager. A quotation with no activity for three days creates a follow-up. After three unanswered calls, we suggest a polite close-the-loop message instead of chasing forever. On-hold leads come back on the date you set, for example a month before possession."
**Click:** Run now → show the new notifications.
**If asked "Why so many 'No response' today?":** "In your sheet, about a third of enquiries end as 'No response'. That's exactly what this part fixes."

### 8. Showroom visit + WhatsApp (1 min)
**Click:** on a lead, **Book showroom visit** for tomorrow 11:00 → Run now → Inbox.
**Say:** "Your team types 'We look forward to welcoming you tomorrow…' by hand today. Now it goes automatically, in English or Hindi. Right now it runs in our simulator. When Meta approves your WhatsApp Business number, the same messages go to real phones."

### 9. Pipeline, reports, campaigns, map (1.5 min)
**Click:** Pipeline → drag a card to "Quotation Sent".
**Say:** "Same 14 stages as your sheet, in your words."
**Click:** Reports.
**Say:** "These are your three Executive Summary pivots: status by product by month, handover by branch, order value by branch and person. Now always up to date, and downloadable."
**Click:** Campaigns.
**Say:** "Which Instagram campaign and which ad brings leads that actually visit and buy, not just leads."
**Click:** Map → type an address in the playground.
**Say:** "This is the area check you can test yourself. Today it uses our own Mumbai–Pune map. With your Google Maps key it becomes exact to the building."

### 10. On the phone (30 sec)
**Click:** open the app on a phone.
**Say:** "It works in the phone browser. Tap to call, tap to WhatsApp. No app install needed."

### 11. Close the demo on the Build Status page (30 sec)
**Click:** Build Status.
**Say:** "Here's everything, honestly marked: what's working, what runs in simulator until your accounts are connected, and what's still being built."

---

## Part D — Status board (mapped to the proposal's 5-week plan)

Legend: ✅ Working now · 🟢 Built, running in **simulator**; switches on with your accounts · 🔧 In progress · ⏳ Waiting on you · 📅 Next phase / add-on

| Proposal week | What was promised | Status today |
|---|---|---|
| **Week 1 — Foundation** | Server, database, secure login, users, roles; a staging link to click | ✅ Login, 5 roles (Owner, Admin, Manager, Online Desk, Sales), role-based visibility · ✅ Staging link *(if deployed to Vercel before the meeting — otherwise say "this week")* |
| **Week 1–2 — CRM screens on live data** | Leads, contacts, companies, deals, tasks | ✅ Leads (list, detail, timeline), kanban pipeline with your 14 stages, contacts, companies (architect firms), deals, tasks ("My Day"), appointments, global search |
| **Week 2 — The brain** | Auto-assign + out-of-area, tested with dummy leads | ✅ Auto-routing by pincode rules + distance, spelling-tolerant · ✅ Round-robin / least-load, skips people on leave · ✅ Out-of-area queue · ✅ Needs-location queue + automatic handover · ✅ Duplicate / returning-customer detection · 🔧 Google Maps exact geocoding (code ready) ⏳ needs your Google Cloud API key |
| **Week 3 — The pipes** | WhatsApp Business API, Facebook/Instagram lead webhook, Google Sheets sync | 🟢 Instagram/Facebook lead webhook built (verification handshake works) ⏳ needs Meta Business access + app approval · 🟢 WhatsApp templates (EN + HI) and sending flow in simulator ⏳ needs WhatsApp Business number + Meta verification (7–21 days) · ✅ Import of Meta lead CSV exports works today · ✅ Click-to-WhatsApp / click-to-call · 🔧 Google Sheets live sync ⏳ needs sheet access |
| **Week 4 — The robot** | Automations, reminders, dashboard, reports, audit log | ✅ 9 automation rules (SLA, escalation, follow-ups, stale quotations, appointment reminders, visit outcome, no-response, revive, daily digest) · ✅ Notifications · ✅ Dashboard · ✅ Your 3 pivots + CSV export · ✅ Campaign performance · ✅ Audit log · 🔧 Email digest · 🔧 WhatsApp broadcasts · 🔧 Two-way WhatsApp inbox |
| **Week 5 — Go-live** | Your data import, 90-min training, go-live, 45 days hypercare | 🔧 Import of your current Sales Pipeline sheet (mapping ready, cleaning rules to agree) · ⏳ Rules Sheet sign-off · 📅 Training & go-live after the Rules Sheet and Meta approvals |
| **Beyond the launch package** | (optional add-ons, prototyped so you can see them) | 📅 Post-sale **Projects** tracker: your 8 site stages + 5-year warranty date (preview) · 📅 **Quotation builder** (concept) · 📅 Leave planner / attendance · 📅 Native apps, multiple WhatsApp numbers, AI call summaries |

**One-line summary for the client:** "The brain and the reminder robot are working. The pipes to Meta and Google are built and waiting for your account access. The rest is on schedule."

---

## Part E — What we learned from your current sheet

> Say this respectfully. Their sheet is well designed: the dropdowns and pivots told us exactly how they work. The CRM keeps their words and adds automation.

From the "Online Sales Pipeline" sheet you shared (128 enquiries, 16 Aug – 17 Oct 2026):

1. **82% of enquiries come from Instagram paid ads** (105 of 128). Instagram is your main channel, so it has to flow in by itself.
2. **About a third end as "Closed Lost – No response"** (44 of 128). That's two-thirds of all losses (44 of 66). This is a follow-up problem, not a demand problem, and the reminder robot targets it directly.
3. **One person owns every row.** When the Online Desk is busy or on leave, follow-ups stop. The CRM spreads the work and covers absences.
4. **For 57 of 128 rows, the sheet doesn't record which branch took the lead,** and the "Handed over to" column mixes branches with a person's name. The CRM records every handover automatically.
5. **Location is free text** ("Borivalli", "Goregoan", "Pune - Pimple Saudagar"), and **at least 6 enquiries were from outside your area** (Surat, Hyderabad, Raipur, Chhattisgarh, Ratnagiri, Madhya Pradesh). The CRM reads locations and parks out-of-area leads automatically.
6. **The Instagram lead form doesn't ask where the site is.** Every lead needs a call just to know which branch should handle it. **Recommendation:** add "Site pincode" and "When do you get possession?" to the form.
7. **The history lives in one Remarks cell** (dated notes like "4/9: … 12/9: …"). It's useful information, but nobody gets reminded by it. The CRM turns it into a timeline with reminders.
8. **Order values recorded so far range from ₹8 L to ₹50 L.** Recovering **one** lost lead pays for the whole CRM.
9. **You've already designed a post-sale "Current Live Projects" sheet** (measurement → factory → installation → handover → 5-year warranty). We've prototyped it as a possible next phase.

---

## Part F — Decisions we need from you (the "Rules Sheet")

We've built sensible defaults, all changeable in Settings. Please confirm or correct each one.

| # | Question | Our default in the demo |
|---|---|---|
| 1 | **How should a new lead be assigned inside a branch?** Turn by turn, or to whoever has fewer open leads? | Turn by turn (Tardeo: fewer open leads) |
| 2 | **Should every lead pass through the Online Desk first,** or go straight to the branch when the location is known? | Straight to the branch when the location is known; Online Desk handles leads without a location |
| 3 | **What is your service area?** Radius per branch, plus any pincodes that must go to a specific branch | Worli 30 km, Andheri 30 km, Tardeo 25 km, Pune 25 km; all Navi Mumbai pincodes → Worli |
| 4 | **What happens to an out-of-area lead?** Manager decides / polite auto-message / assign as low priority | Manager decides |
| 5 | **Working hours and night leads** | 10:00–19:30, all 7 days. Night leads get the WhatsApp welcome at once; the call is due next morning. |
| 6 | **First-call promise (SLA)** | Within 1 working hour; escalate to the branch manager after 4 hours |
| 7 | **Same phone number enquires again** | Link to the existing lead, same salesperson |
| 8 | **WhatsApp messages and language** | Welcome, location request, appointment reminder, quotation follow-up, close-the-loop, out-of-area; English + Hindi |
| 9 | **Who's on the team today, and in a year?** Names, branch, role | 13 demo users across Online Desk + 4 branches |
| 10 | **Old data:** import all of the current sheet? What to do with duplicate phone numbers? | Import all; merge duplicates into one customer with several enquiries |
| 11 | **Exact showroom locations** (map pins) | Area-level pins in the demo |
| 12 | **Instagram form:** can we add "Site pincode" and "Possession timeline"? | Recommended |

---

## Part G — What we need from you (access & inputs)

Bills stay in your name, as agreed in the proposal. We never mix your ad spend or WhatsApp usage into our fee.

1. **Meta Business Manager** admin access (for the Instagram/Facebook lead webhook) and the Facebook Page linked to your lead forms.
2. **WhatsApp Business number** (a company number, not a personal phone) and Meta business verification. *Start now — approval takes 7–21 days.*
3. **Google Cloud** project with billing in your name, for the Maps geocoding key. At your volume, usage normally stays inside Google's free monthly quota.
4. **Google Sheet** access, if you want Sheets sync.
5. **Domain** for the CRM (e.g., `crm.yourdomain.com`).
6. **Branch pin locations, service areas, and team list** (names, phones, branch, role).
7. **Your latest full sales sheet** for the import trial.

---

## Part H — Next two weeks

| When | What |
|---|---|
| This week | 45-minute call to freeze the Rules Sheet (Part F) · you start Meta & WhatsApp verification · we share the staging link with your team |
| Next week | Switch the lead webhook to your real Instagram forms (once access is given) · Google Maps key live · import trial of your current sheet · your team tries the staging link and sends feedback |
| After Meta approval | WhatsApp templates submitted and switched from simulator to live · training (90 min) · go-live checklist |

---

## Part I — Closing lines

> "The hardest part, the brain that decides who gets which lead and the robot that makes sure nobody forgets, is working today. What's left mostly depends on access from Meta and Google, and that's why we'd like to start those approvals this week. If you can give us 45 minutes this week to freeze the rules, your team can start using the staging version right after."

---

## Part J — Follow-up message after the meeting (paste on WhatsApp / email)

> Hi <Name>, thank you for your time today.
>
> **What you saw working:** automatic routing of leads to Worli / Andheri / Tardeo / Pune by area (including spelling mistakes and pincodes), out-of-area and no-location queues, automatic assignment that skips people on leave, follow-up reminders and escalations that run even when nobody is logged in, showroom-visit reminders, the dashboard, and your three Excel pivots live.
>
> **Running in simulator until your accounts are connected:** Instagram/Facebook lead webhook and WhatsApp messages.
>
> **Next steps:**
> 1. A 45-minute call this week to freeze the Rules Sheet. I'll send the 12 questions.
> 2. Please start Meta Business + WhatsApp Business verification (7–21 days).
> 3. Google Cloud project for the Maps key (billing in your name).
> 4. Team list and branch locations.
>
> Once we have these, we'll share the staging link with your team.
>
> — Rana

---

## Part K — One-page summary you can share (no prices)

**Elementra CRM — progress update**

*Built and working:* one place for all leads · automatic branch routing by pincode and distance (spelling-tolerant) · automatic assignment with leave cover · out-of-area and no-location queues with one-click handover · your 14 sales stages as a drag-and-drop pipeline · follow-ups and appointments · 9 server-side automations (SLA alerts, escalations, quotation follow-ups, appointment reminders, revive on-hold leads, daily digest) · dashboard, your Excel pivots live, campaign performance · audit log · works on mobile browsers.

*Built, waiting for your accounts:* Instagram/Facebook lead webhook · WhatsApp Business messages (English + Hindi) · Google Maps exact location check.

*In progress:* Google Sheets sync · import of your current sheet · email digest · WhatsApp broadcasts and two-way inbox.

*Possible next phase:* post-sale project tracker with warranty dates · quotation builder · native apps.
