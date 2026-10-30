# Elementra CRM — Demo Rehearsal Guide

> **For:** Rana, presenting live. About 15 minutes of demo plus 10 minutes of talk.
> **How to use:** read it once fully. Then rehearse twice out loud with a timer. On demo day keep **Part 6 (cheat sheet)** open on your phone.
> **Note:** steps 1–6 follow the scenario flow in the spec. Match the button names to steps 1–6 in your build's demo file. Steps 7–12 follow your build's demo file exactly.

---

## Part 1 — The three things the client must leave believing

Everything you click serves one of these. If you're short on time, cut steps, not these messages.

1. **"Every lead gets the right owner instantly, and we can see why."** (Steps 2–6: the brain)
2. **"Nothing gets forgotten. The system chases, even when nobody is logged in."** (Steps 7–8: the robot)
3. **"I can see my whole business, and this is real and progressing."** (Steps 1, 9–12: visibility + honesty)

Keep their pain in mind the whole time: **a third of their leads (44 of 128) died as "No response."** You'll mention it once, in step 7. That number is your strongest card.

---

## Part 2 — Setup (30 minutes before)

| ✓ | Do this | Why |
|---|---|---|
| ☐ | `npm run db:seed:demo` (takes ~2 s) | Fresh data with "today" dates. Don't use the in-app Reset button; it wasn't tested. |
| ☐ | `npm run dev:all` running and the reminder runner ticking in the terminal | Reminders in steps 7–8 depend on it |
| ☐ | **Browser window A:** logged in as **Owner** | Main presenting window |
| ☐ | **Browser window B** (a second Chrome profile or incognito): logged in as **Andheri Rep** | Saves you a sign-out/sign-in in step 7, and Owner can still press "Run now" in window A |
| ☐ | Set Arjun (Andheri rep) **on leave = OFF** before you start | Step 6 turns it on; you'll turn it off again |
| ☐ | Mark all notifications read in both windows | New ones stand out |
| ☐ | Browser zoom 110–125%, other tabs closed, Do Not Disturb on | Readability, no embarrassing pop-ups |
| ☐ | Have **Chrome DevTools → device toolbar (Ctrl+Shift+M), iPhone width** ready for step 11 | See the "phone" note in step 11 |
| ☐ | **A screen recording of one full run** saved on the desktop | Your backup if anything breaks |
| ☐ | Check the time: **is it before 11:00 AM?** | See step 8, or the appointment reminder may not fire |

---

## Part 3 — Opening (60 seconds, no clicking)

> "Thank you for the time. When we last spoke, the problem was clear: leads come from Instagram, WhatsApp, calls and walk-ins; nobody is fully sure who owns each one; leads from outside your area waste the team's time; and follow-up depends on memory.
>
> Today I'll show you the CRM running on a real database with dummy customers. A lead comes in, the system works out where the site is, sends it to the right Experience Centre, gives it to a person, and then keeps chasing that person until the lead is closed, won or lost.
>
> I'll also show you what's still being built. It's clearly marked inside the app, so you know exactly where we are. About 15 minutes, then your questions."

---

## Part 4 — The demo, step by step

Format for each step: **Goal** (why it's in the demo) · **Click** · **Say** · **Point at** · **If they ask** · **Careful**.

---

### Step 1 — The owner's morning (1.5 min) · *Window A, Owner*

**Goal:** show visibility first, so everything after has context.

**Click:** Dashboard.

**Say:**
> "This is your screen in the morning. New leads, how many haven't been called yet, overdue follow-ups, out-of-area enquiries, showroom visits booked, and the value sitting in the pipeline."
>
> "This chart is the one owners like most: **overdue follow-ups by person.** You know who needs a nudge without calling anyone."

**Point at:** the KPI tiles, then the overdue-by-rep chart.

**If they ask "Is this your data?":**
> "Dummy data, shaped exactly like your sheet: same 14 stages, same sources, same branches. Your real leads come in at go-live."

**Careful:** don't explain every chart. Two sentences, then move on. The live lead in step 2 is more exciting.

---

### Step 2 — A lead arrives from Instagram (2 min)

**Goal:** the "wow". A lead gets a branch, a person and an explanation by itself.

**Click:** Demo panel → **Instagram ad — Worli flat**. Pause and let the toast appear and the bell increment.

**Say:**
> "A customer just filled your Instagram ad form. Look: before anyone touched it, it already has a branch, **Worli**, and a person. And the customer has received a WhatsApp welcome."

**Click:** open the lead.

**Point at:** the **"Why this branch"** card, then the **timeline**.

**Say:**
> "If you ever ask 'why did this go to Worli?', the answer is written right here: the pincode is in Worli, 0 km from the centre, and it was this person's turn. And the timeline shows everything that happened: received, routed, assigned, welcome sent."
>
> "This replaces the 'Handed over to' column and the WhatsApp forwarding."

**If they ask "How does it pick the person?":**
> "Turn by turn inside the branch, the person who got a lead longest ago goes next. Or, if you prefer, whoever has the fewest open leads. It's a setting."

---

### Step 3 — Spelling mistakes and pincode rules (2 min)

**Goal:** prove it handles real-world messy input, and that **their rules** win.

**Click:** Demo panel → **Misspelt suburb**. Open it and show the routing card.

**Say:**
> "Your sheet has entries like 'Borivalli' and 'Goregoan'. Here the customer typed **'goregoan east'**. The system understood **Goregaon East**, 4.4 km from Andheri, so Andheri gets it."

**Click:** Demo panel → **Navi Mumbai pincode rule**. Show the card.

**Say:**
> "This one is Vashi. By distance, Andheri is slightly closer: 18.9 km against 20.3 km for Worli. But suppose you tell us 'all of Navi Mumbai belongs to Worli'. That's a **rule**, and the rule wins over distance. **You decide the rules; the system follows them.**"

**Point at:** both distances on the card, and the words "pincode rule".

**If they ask "Who sets these rules?":**
> "You do, in Settings. Service radius per branch, which pincodes go where. That's the 'Rules Sheet' we'll freeze together this week."

---

### Step 4 — Out of area, and the borderline case (1.5 min)

**Goal:** show the system protecting the team's time.

**Click:** Demo panel → **Out of area — Surat**, then **Borderline — Panvel** → open **Queues → Out of area**.

**Say:**
> "Surat is 226 km away. Instead of landing on a busy salesperson, it's parked here for a manager."
>
> "Panvel is more interesting: 31.8 km from Worli, just outside the 30 km radius. Maybe you want it, maybe not. A manager decides in one click."

**Click:** **Accept** Panvel for Worli.

**Say:**
> "Now it's assigned like any normal lead. Or, if you prefer, the system can send a polite 'we don't serve your area yet' message by itself. Your choice."

**If they ask "How accurate is the distance?":**
> "Today it uses our own map of Mumbai, Thane, Navi Mumbai and Pune localities. Once you add a Google Maps key, it's exact to the building. At your volume Google is usually free, and the bill is in your name."

---

### Step 5 — Leads without a location (1.5 min)

**Goal:** solve their real daily pain. Their Instagram form doesn't ask where the site is.

**Click:** Demo panel → **No location (typical Meta form)** → switch to **Online Desk** → **Queues → Needs location**.

**Say:**
> "Your Instagram form asks for product, name, email and phone, but not where the site is. So today your Online Desk has to call every single lead just to know which branch should handle it. Those leads come here."

**Click:** type **Borivalli west** in the area field → Save. Wait for the toast.

**Say:**
> "She calls, types 'Borivalli west', with the spelling mistake, and it's **handed over to Andheri** instantly. Andheri is notified, and the timeline records the handover."

**The tip (say it slowly; it's valuable advice):**
> "One small suggestion: add one question, **'Site pincode'**, to your Instagram form. Then most leads route themselves with no call needed."

**Careful:** if you can't switch users quickly, do this step as Owner. The queue and the action are the same.

---

### Step 6 — Someone is on leave (1 min) · *Window A, Owner*

**Goal:** the team-management side. Leads go to people who are actually available.

**Click:** Demo panel → **Rep on leave**. Show the routing card.

**Say:**
> "Arjun from Andheri is on leave today. The system **skipped him** and gave the lead to Meera, and it says so right here."

**Click:** **Team** page → show the on-leave toggle and the open-lead / overdue columns → **turn Arjun's leave OFF**.

**Say:**
> "This is the team side. Who's in which branch, who's available, how many open leads each person is carrying. When Arjun is back, he's in the rotation again."

**Careful:** you **must** turn Arjun's leave off here. Step 7 logs in as the Andheri rep.

---

### Step 7 — The reminder robot (2.5 min)

**Goal:** this is the fix for their biggest loss. Slow down here.

**Click (Window A, Owner):** **Automations** page. The R1–R9 cards show a plain-English description, on/off, fired today/this week, and last firings.

**Say (the key line, then pause):**
> "In your sheet, **about a third of all enquiries ended as 'No response'.** 44 out of 128. That's not a demand problem; that's a follow-up problem. This page is the fix."

Then pick **four** cards and say them in plain words. Don't read all nine:
> "A new lead not called within one working hour: the salesperson is alerted. Still not called after four hours: the **branch manager** is alerted."
>
> "A quotation sent with no activity for three days: a follow-up task is created by itself."
>
> "Three unanswered calls: instead of chasing forever, it suggests a polite 'close the loop' message."
>
> "A customer on hold until possession: the lead comes back by itself on the date you set."
>
> "And all of this runs **on the server**, at night, on Sunday, even if every laptop is closed."

**Click:** **Run now** → point at the counts or new notifications.

**Now the rep's view. Click (Window B, Andheri Rep):** **My Day**.

**Say:**
> "This is what a salesperson sees: **Overdue, Today, Upcoming.** No memory, no diary."

**Click:** an **overdue** task's lead → **Log call** tab → **No answer** → **Log call** → in **Next follow-up** click **Tomorrow**.

**Point at:** the toast **"Follow-up set for Tomorrow 11:00 AM"**, then go back to My Day and show the task has moved to tomorrow.

**Say:**
> "Two clicks: 'no answer', 'call tomorrow'. It's off today's list and back on tomorrow's. If he forgets, the system doesn't."

**If they ask "Can the rules be changed?":**
> "Yes. Each one can be turned on or off and its timing changed, like one hour or two, three days or five."

**If they ask "Does the manager get an email?":**
> "Today it's in-app notifications plus a morning digest inside the app. The email digest is in progress."

---

### Step 8 — Showroom visit + WhatsApp reminder (1 min) · *stay on the same lead, Window B*

**Goal:** kill a manual chore their team does by hand every day. Their sheet is full of "We look forward to welcoming you tomorrow…" messages typed manually.

**Click:** **Book showroom visit** tab. It defaults to the lead's branch, tomorrow 11:00 and a host → **Book visit**.

**Say while waiting (this fills the up-to-60-second gap):**
> "Today your team types 'We look forward to welcoming you tomorrow at our Worli centre…' by hand, for every visit. Now, the moment the reminder engine runs (and it runs every minute), the customer gets it automatically. In English or Hindi."

**Then:** either wait for the next runner tick (≤ 60 s), or switch to **Window A (Owner) → Automations → Run now**. Then **Inbox** → open the lead.

**Point at:** the message **"Showroom visit reminder … tomorrow at 11:00 AM, <host> will host you, Location: map link"** and the delivery ticks.

**Say:**
> "Right now it runs in our **simulator**, so no real customer gets a message during testing. Once Meta approves your WhatsApp Business number, these same messages go to real phones."

**⚠ Careful (timing):** the reminder fires when the visit is **within 24 hours**. If you demo **before 11:00 AM**, "tomorrow 11:00" is more than 24 hours away and **nothing will appear**. In that case pick a time **within the next 24 hours** (e.g., today evening, or tomorrow 9:30 AM). Check this during rehearsal at the same time of day as the real demo.

---

### Step 9 — Pipeline (1 min)

**Goal:** show their own 14 stages, in their own words, with drag and drop.

**Click:** **Pipeline** → drag a card from **"5. Quotation Requested"** to **"6. Quotation Sent"** → toast.

**Say:**
> "Same stages as your sheet, same words. Drag, and it's recorded. The timeline logs who moved it and when."

**Click:** scroll right → drag another card onto **Lost** → choose **On hold**.

**Point at:** the **revive date already filled in, a month before possession.**

**Say:**
> "Your customers often wait for possession. Mark it 'On hold', and the system pre-fills a date one month before possession to bring it back. The lead isn't lost; it's parked with an alarm."

→ **Close**.

**If you're still in the rep window:**
> "Notice Arjun only sees **his own** pipeline. Salespeople see their leads, managers see their branch, you see everything."

---

### Step 10 — Reports and map (1.5 min) · *Window A, Owner*

**Click:** **Reports**.

**Say:**
> "These are your three Executive Summary pivots from the Excel: **A**, leads by status, product and month; **B**, handover by branch; **C**, order value by branch and by person. The difference is they're **always up to date**, and each one downloads as CSV."
>
> "Plus two you don't have today: which **source** actually turns into business, and **why leads were lost.**"

**Click:** **Map**.

**Say:**
> "Your four centres with their service circles, and every lead as a pin."

**Click:** Routing playground → type **kandiwali east**.

**Point at:** **Kandivali East (fuzzy) → Andheri 8.7 km**, and the next rep shown.

**Say:**
> "You can test any address yourself, even with a spelling mistake, and see which branch and which person would get it. Nothing is saved; it's a test box."

**If tiles load slowly:**
> "The map background is OpenStreetMap for now. It switches to Google Maps with your key. The routing doesn't depend on the tiles."

---

### Step 11 — On the phone (30 s)

**Click:** DevTools device toolbar (Ctrl+Shift+M) → iPhone width. Or use the staging link on a real phone.

**Point at:** the leads list as **cards** with big **Call** / **WhatsApp** buttons; lead detail **stacks** with the follow-up first; My Day works.

**Say:**
> "Your team lives on their phones. It works in the phone browser, no app to install. Tap to call, tap to WhatsApp, set the next follow-up."

**⚠ Careful:** don't open `localhost:4610` from your real phone over Wi-Fi. Login is configured for `localhost` and will likely fail on the phone. Use the DevTools view, or the Vercel staging URL if you deployed one.

---

### Step 12 — Close on Build Status (30 s)

**Click:** sidebar → **Build Status**.

**Say:**
> "Last screen, and the most honest one. Everything, marked: **Live**, **Simulator** (built, waiting for your Meta and Google access), **Preview**, **In progress**, **Planned**. It's grouped by the same five weeks as our proposal."
>
> "In short: **the brain and the reminder robot are working today. The connections to Meta and Google are built and waiting for your access. The rest is on schedule.**"

**If they point at "Beyond the launch package" (Projects, Quotations):**
> "Those are next-phase ideas. We prototyped the project tracker from your own 'Current Live Projects' sheet so you can see it. They're not part of the current package; we'll quote them once launch is live."

---

## Part 5 — After the demo: the ask (3 minutes; don't skip)

> "To go live, we need three things from you:
> 1. **45 minutes this week** to freeze the rules: who gets what, your service area, what to do with out-of-area leads, working hours.
> 2. **Start the Meta and WhatsApp Business verification now.** It takes 7 to 21 days, and it's the longest wait in the whole project.
> 3. **A Google Cloud account in your name** for the Maps key, plus your team list and branch locations.
>
> Once we have these, your team gets the staging link to try."

Then send the follow-up message from `03_CLIENT_PITCH_AND_DEMO_SCRIPT.md` Part J the same day.

---

## Part 6 — Cheat sheet (keep on your phone)

| # | Step | Key words / numbers |
|---|---|---|
| 1 | Dashboard | "Overdue by person: who needs a nudge" |
| 2 | Instagram ad → Worli | "Branch + person + WhatsApp before anyone touched it" · Why card |
| 3 | goregoan east · Vashi | Goregaon East → Andheri **4.4 km** · Vashi: Andheri **18.9** vs Worli **20.3**, **rule wins** |
| 4 | Surat · Panvel | Surat **226 km** → parked · Panvel **31.8 km** (radius 30) → Accept |
| 5 | No location → Online Desk | type **Borivalli west** → handover to Andheri · tip: **add "Site pincode" to the form** |
| 6 | Rep on leave | "Skipped Arjun (on leave)" → **turn leave OFF** |
| 7 | Automations + My Day | **44 of 128 = "No response"** · 1 h → rep, 4 h → manager · No answer → Tomorrow |
| 8 | Book visit → Inbox | Reminder with ticks · "simulator until Meta approves" · ⚠ within 24 h |
| 9 | Pipeline | 5 → 6 drag · Lost → On hold → revive date pre-filled |
| 10 | Reports · Map | "Your 3 pivots, always up to date" · **kandiwali east → Andheri 8.7 km** |
| 11 | Phone | DevTools iPhone width · Call / WhatsApp buttons |
| 12 | Build Status | "Brain + robot working; pipes waiting for your access" |

**Logins:** Owner · Online Desk · Andheri Rep (quick-login chips).
**Their sheet's numbers:** 128 enquiries (16 Aug – 17 Oct) · 82% from Instagram paid · 44 (34%) "No response" · 1 won · order values ₹8–50 L.

---

## Part 7 — Don't click these (not tested end to end)

Your build's own notes list these as not verified in the browser. Avoid them live, or test each one yourself during rehearsal first:

- Submitting the public **/enquire** form (its API works; the page wasn't clicked through)
- The **CSV import** screen
- The **template editor**
- **Advancing a project's stage** (Projects page)
- **WhatsApp broadcasts**
- **Simulate customer reply**
- **Google Sheet row** button
- The in-app **Reset** button. Use `npm run db:seed:demo` in the terminal instead.

**If the client asks to see one of these:**
> "That one's in progress. I'll show it in our next update rather than half-built today."

---

## Part 8 — If something goes wrong live

| Problem | Do this | Say |
|---|---|---|
| Data looks odd or stale | Terminal: `npm run db:seed:demo` (2 s) → refresh | "Let me refresh the demo data." |
| Can't sign out | Go to `/login` directly | Nothing; just do it |
| Map tiles slow | Carry on with the playground panel | "Map background is the free map for now; routing doesn't depend on it." |
| Reminder/inbox message doesn't appear | Owner window → Automations → **Run now**; check the 24-hour rule (step 8) | "The engine runs every minute; I'll trigger it manually." |
| A scenario routes somewhere unexpected | Open the **Why this branch** card and read it out | "And this is why we show the reasoning. You can always see why." |
| Anything crashes | Switch to your **screen recording** for that step | "This is the work-in-progress build; that's exactly why we demo early. Here's that step from our test run." |

**Golden rule:** never debug in front of the client. Recover in one action, or switch to the recording and keep talking.

---

## Part 9 — Rehearsal plan

1. **Run 1 (tonight):** click everything with this guide open. Fix anything that surprises you.
2. **Run 2:** say every line out loud with a timer. Target **15 minutes** for Part 4.
3. **Run 3 (demo morning, at the same time of day as the demo):** quick pass. Mainly checks step 8's 24-hour timing and that the runner is ticking.
4. Record Run 2 or Run 3 as your backup video.
5. Learn three numbers cold: **44 of 128**, **226 km**, **31.8 km**. Everything else is on screen.
