// ingestLead(): the one entry point for every new lead — manual form, /enquire, Meta webhook,
// CSV import, demo scenarios, Sheets simulator (spec §8.1).
import { z } from "zod";
import { IntakeChannel, LeadSource, Priority, Product, type Lead, type LocationStatus, type Prisma, type RoutingRule } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/domain/audit";
import { notify, ownerIds } from "@/lib/domain/notify";
import { sendTemplate } from "@/lib/domain/messaging/send";
import { parsePhones } from "@/lib/domain/phone";
import { resolveLocation, type ResolvedLocation } from "@/lib/domain/geo/resolve";
import { decideBranch, shortBranch, type BranchDecision } from "@/lib/domain/routing/decide";
import { pickAssignee, type AssigneePick } from "@/lib/domain/routing/assign";
import { addWorkingMinutes, friendlyIST, isWithinWorkingHours } from "@/lib/domain/time";
import { CHANNEL_LABEL, SOURCE_LABEL } from "@/lib/domain/labels";
import { isOpenStage } from "@/lib/domain/stages";
import { loadMembers, loadRoutingContext, nextRefCode } from "./context";

const optText = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((v) => (v ? v : null));

export const ingestSchema = z.object({
  salutation: optText,
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: optText,
  phone: optText,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => !v || z.email().safeParse(v).success, "Email looks wrong"),
  siteAddress: optText,
  pincode: optText,
  city: optText,
  products: z.array(z.enum(Product)).default([]),
  source: z.enum(LeadSource),
  channel: z.enum(IntakeChannel),
  priority: z.enum(Priority).optional(),
  language: z.enum(["en", "hi"]).optional(),
  campaignName: optText,
  adsetName: optText,
  adName: optText,
  formName: optText,
  platform: optText,
  externalId: optText,
  architectId: optText,
  architectName: optText,
  notes: z.string().trim().max(4000).nullish(),
  budgetNote: optText,
  estimatedValueInr: z.number().int().nonnegative().nullish(),
  possessionDate: z.coerce.date().nullish(),
  receivedAt: z.coerce.date().optional(),
  rawPayload: z.unknown().optional(),
});

export type IngestInput = z.input<typeof ingestSchema>;

export interface DecisionSummary {
  leadId: string;
  refCode: string;
  name: string;
  rule: RoutingRule;
  branchName: string | null;
  ownerName: string | null;
  explanation: string[];
  candidates: BranchDecision["candidates"];
  skipped: AssigneePick["skipped"];
  toast: string;
  duplicateOf?: string | null;
  existing?: boolean;
}

export type IngestResult = { ok: true; lead: Lead; decision: DecisionSummary } | { ok: false; error: string };

const titleCase = (s: string | null) =>
  s ? s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase()) : s;

function channelPhrase(channel: IntakeChannel, platform: string | null) {
  if (channel === "META_LEAD_AD") return platform === "fb" ? "Facebook lead ad" : "Instagram lead ad";
  return CHANNEL_LABEL[channel].toLowerCase();
}

export async function ingestLead(raw: IngestInput, opts: { actorId?: string | null; now?: Date } = {}): Promise<IngestResult> {
  const parsed = ingestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  const input = parsed.data;
  const now = opts.now ?? new Date();
  const receivedAt = input.receivedAt ?? now;
  const actorId = opts.actorId ?? null;

  // 1. Normalise
  const firstName = titleCase(input.firstName)!;
  const lastName = titleCase(input.lastName);
  const { primary, alt } = parsePhones(input.phone);
  if (!primary && !input.email) return { ok: false, error: "A phone number or an email is required." };

  // 2. Idempotency (Meta retries webhooks)
  if (input.externalId) {
    const existing = await prisma.lead.findUnique({ where: { externalId: input.externalId }, include: { branch: true, owner: true } });
    if (existing) {
      return {
        ok: true,
        lead: existing,
        decision: {
          leadId: existing.id,
          refCode: existing.refCode,
          name: `${existing.firstName} ${existing.lastName ?? ""}`.trim(),
          rule: "MANUAL",
          branchName: existing.branch ? shortBranch(existing.branch.name) : null,
          ownerName: existing.owner?.name ?? null,
          explanation: [`Already received as ${existing.refCode} — nothing new created.`],
          candidates: [],
          skipped: [],
          toast: `Already in the CRM as ${existing.refCode}`,
          existing: true,
        },
      };
    }
  }

  const ctx = await loadRoutingContext();
  const { settings } = ctx;
  const wh = settings.workingHours;

  // 3. Duplicate / returning customer
  let duplicateOf: (Lead & { owner: { id: string; name: string; isActive: boolean } | null }) | null = null;
  if (primary) {
    const since = new Date(now.getTime() - settings.duplicates.windowDays * 86400_000);
    duplicateOf = await prisma.lead.findFirst({
      where: { phoneE164: primary.e164, createdAt: { gte: since } },
      orderBy: [{ createdAt: "desc" }],
      include: { owner: { select: { id: true, name: true, isActive: true } } },
    });
    // Prefer an open one if several exist
    if (duplicateOf && !isOpenStage(duplicateOf.stage)) {
      const open = await prisma.lead.findFirst({
        where: { phoneE164: primary.e164, createdAt: { gte: since }, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } },
        orderBy: { createdAt: "desc" },
        include: { owner: { select: { id: true, name: true, isActive: true } } },
      });
      if (open) duplicateOf = open;
    }
  }
  const openDuplicate = duplicateOf && isOpenStage(duplicateOf.stage) ? duplicateOf : null;
  const sameOwner = openDuplicate && settings.duplicates.policy === "LINK_SAME_OWNER" && openDuplicate.owner?.isActive ? openDuplicate : null;

  // 4–6. Resolve → decide → assign
  const loc: ResolvedLocation = resolveLocation(
    { siteAddress: input.siteAddress, pincode: input.pincode, city: input.city },
    ctx.localities,
    { fuzzyThreshold: settings.geo.fuzzyThreshold },
  );
  let decision = decideBranch(loc, ctx.branches, ctx.rules, settings.routing.mode);
  let rule: RoutingRule = decision.rule;
  let branchId = decision.branchId;
  let priority: Priority = input.priority ?? "WARM";
  let assignee: AssigneePick | null = null;
  let explanation = [...decision.explanation];

  if (sameOwner) {
    rule = "RETURNING_SAME_OWNER";
    branchId = sameOwner.branchId;
    explanation = [
      `Returning customer: phone matches open lead ${sameOwner.refCode}.`,
      `Same owner and branch as before (${sameOwner.owner!.name}); area routing skipped.`,
    ];
    assignee = { userId: sameOwner.owner!.id, name: sameOwner.owner!.name, strategy: "ROUND_ROBIN", skipped: [], fallback: null, explanation: [] };
  } else if (decision.rule === "OUT_OF_AREA" && settings.routing.outOfAreaAction === "ASSIGN_LOW_PRIORITY" && decision.candidates[0]) {
    branchId = decision.candidates[0].branchId;
    priority = "COLD";
    explanation.push(`Settings say "assign out-of-area as low priority" → ${decision.candidates[0].name}, priority Cold.`);
    decision = { ...decision, branchId };
  }

  const branch = ctx.branches.find((b) => b.id === branchId) ?? null;
  if (!assignee && branch && !(decision.rule === "OUT_OF_AREA" && settings.routing.outOfAreaAction !== "ASSIGN_LOW_PRIORITY")) {
    const members = await loadMembers(branch.id);
    assignee = pickAssignee(shortBranch(branch.name), branch.assignmentStrategy, members, now);
  }

  const locationStatus: LocationStatus =
    rule === "NEEDS_LOCATION"
      ? "NEEDS_LOCATION"
      : rule === "OUT_OF_AREA" && !(settings.routing.outOfAreaAction === "ASSIGN_LOW_PRIORITY" && branchId)
        ? "OUT_OF_AREA"
        : rule === "RETURNING_SAME_OWNER" && loc.kind !== "RESOLVED"
          ? (sameOwner?.locationStatus ?? "RESOLVED")
          : loc.kind === "NONE"
            ? "NEEDS_LOCATION"
            : "RESOLVED";

  const ownerId = assignee?.userId ?? null;
  const afterHours = !isWithinWorkingHours(receivedAt, wh);
  const firstDue = addWorkingMinutes(receivedAt, settings.sla.firstContactMins, wh);
  const branchLabel = branch ? (branch.kind === "ONLINE_DESK" ? "Online Desk" : shortBranch(branch.name)) : null;
  const queueOwners = await ownerIds();

  // 7. Persist
  const lead = await prisma.$transaction(
    async (tx) => {
      const refCode = await nextRefCode(tx);
      let contact = primary
        ? await tx.contact.findFirst({ where: { phoneE164: primary.e164, kind: "CUSTOMER" } })
        : input.email
          ? await tx.contact.findFirst({ where: { email: input.email, kind: "CUSTOMER" } })
          : null;
      if (!contact) {
        contact = await tx.contact.create({
          data: {
            kind: "CUSTOMER",
            firstName,
            lastName,
            email: input.email,
            phone: primary?.e164 ?? null,
            phoneE164: primary?.e164 ?? null,
            ownerId,
            createdAt: receivedAt,
          },
        });
      }

      let architectCommissionPct: number | null = null;
      let architectId = input.architectId;
      if (!architectId && input.architectName) {
        const [first] = input.architectName.split(" ");
        const arch = await tx.contact.findFirst({ where: { kind: "ARCHITECT", firstName: { equals: first, mode: "insensitive" } } });
        architectId = arch?.id ?? null;
      }
      if (architectId) {
        const arch = await tx.contact.findUnique({ where: { id: architectId }, select: { title: true } });
        const m = arch?.title?.match(/([\d.]+)%/);
        architectCommissionPct = m ? Number(m[1]) : null;
      }

      const created = await tx.lead.create({
        data: {
          refCode,
          contactId: contact.id,
          salutation: input.salutation,
          firstName,
          lastName,
          phoneE164: primary?.e164 ?? null,
          altPhoneE164: alt?.e164 ?? null,
          email: input.email,
          language: input.language ?? settings.messaging.defaultLanguage,
          siteAddressRaw: input.siteAddress,
          pincode: loc.pincode,
          localityId: loc.locality && "id" in loc.locality ? (loc.locality.id ?? null) : null,
          city: loc.locality?.city ?? input.city,
          lat: loc.lat,
          lng: loc.lng,
          geoMethod: loc.method,
          geoConfidence: loc.confidence,
          locationStatus,
          branchId,
          ownerId,
          assignedAt: ownerId ? receivedAt : null,
          products: input.products,
          priority,
          possessionDate: input.possessionDate,
          budgetNote: input.budgetNote,
          estimatedValueInr: input.estimatedValueInr,
          architectId,
          architectCommissionPct,
          source: input.source,
          intakeChannel: input.channel,
          campaignName: input.campaignName,
          adsetName: input.adsetName,
          adName: input.adName,
          formName: input.formName,
          platform: input.platform,
          externalId: input.externalId,
          rawPayload: (input.rawPayload ?? undefined) as Prisma.InputJsonValue | undefined,
          duplicateOfId: duplicateOf?.id ?? null,
          isReturning: !!duplicateOf,
          nextFollowUpAt: ownerId ? firstDue : null,
          lastActivityAt: receivedAt,
          stageChangedAt: receivedAt,
          createdAt: receivedAt,
        },
      });

      const routing = await tx.routingDecision.create({
        data: {
          leadId: created.id,
          inputText: loc.inputText || null,
          geoMethod: loc.method,
          geoConfidence: loc.confidence,
          matchedLabel: loc.label,
          rule,
          distanceKm: rule === "RETURNING_SAME_OWNER" ? null : decision.distanceKm,
          candidates: decision.candidates as unknown as Prisma.InputJsonValue,
          chosenBranchId: branchId,
          chosenUserId: ownerId,
          strategy: assignee && rule !== "RETURNING_SAME_OWNER" ? assignee.strategy : null,
          skipped: (assignee?.skipped ?? []) as unknown as Prisma.InputJsonValue,
          explanation: [...explanation, ...(assignee?.explanation ?? [])],
          actorId,
          createdAt: receivedAt,
        },
      });

      // Timeline (explainability): received → routed → assigned, 10 ms apart so the order is stable
      const at = (step: number) => new Date(receivedAt.getTime() + step * 10);
      const campaign = input.campaignName ? ` · campaign "${input.campaignName}"` : "";
      const timeline: Prisma.ActivityCreateManyInput[] = [
        {
          leadId: created.id,
          type: "SYSTEM",
          body: `Lead received from ${channelPhrase(input.channel, input.platform)} · ${SOURCE_LABEL[input.source]}${campaign}`,
          userId: actorId,
          createdAt: at(0),
        },
        { leadId: created.id, type: "ROUTING", body: explanation.join("\n"), meta: { decisionId: routing.id, rule }, createdAt: at(1) },
      ];
      if (input.notes) timeline.push({ leadId: created.id, type: "NOTE", body: input.notes, userId: actorId, createdAt: at(0) });
      if (assignee?.userId) {
        timeline.push({
          leadId: created.id,
          type: "ASSIGNMENT",
          body: [`Assigned to ${assignee.name}${branchLabel ? ` (${branchLabel})` : ""}.`, ...assignee.explanation].join("\n"),
          meta: { userId: assignee.userId },
          createdAt: at(2),
        });
      } else if (rule === "OUT_OF_AREA") {
        timeline.push({ leadId: created.id, type: "SYSTEM", body: "No owner yet — waiting in the Out-of-area queue for a manager's decision.", createdAt: at(2) });
      } else if (assignee?.fallback === "UNASSIGNED") {
        timeline.push({ leadId: created.id, type: "SYSTEM", body: assignee.explanation.join("\n"), createdAt: at(2) });
      }
      if (afterHours && ownerId) {
        timeline.push({
          leadId: created.id,
          type: "SYSTEM",
          body: `Received after hours — first call due ${friendlyIST(firstDue, receivedAt)}.`,
          createdAt: at(3),
        });
      }
      await tx.activity.createMany({ data: timeline });

      // First task
      if (ownerId) {
        const needsLocation = locationStatus === "NEEDS_LOCATION";
        await tx.task.create({
          data: {
            leadId: created.id,
            assigneeId: ownerId,
            type: needsLocation ? "CAPTURE_LOCATION" : "FIRST_CALL",
            title: needsLocation ? `Call ${firstName} to get the site area / pincode` : `First call: ${firstName} ${lastName ?? ""}`.trim(),
            dueAt: firstDue,
            dedupeKey: `FIRST:${created.id}`,
            createdAt: receivedAt,
          },
        });
        await tx.user.update({ where: { id: ownerId }, data: { lastAssignedAt: now } });
      } else if (locationStatus === "OUT_OF_AREA") {
        const dist = decision.candidates[0] ? ` — ${decision.candidates[0].distanceKm.toFixed(1)} km from ${decision.candidates[0].name}` : "";
        await tx.task.createMany({
          data: queueOwners.map((uid) => ({
            leadId: created.id,
            assigneeId: uid,
            type: "OUT_OF_AREA_REVIEW" as const,
            title: `Out of area: ${firstName} (${loc.locality?.name ?? loc.label ?? "unknown"}${dist}) — accept or regret`,
            dueAt: addWorkingMinutes(receivedAt, settings.sla.escalateMins, wh),
            dedupeKey: `OOA:${created.id}:${uid}`,
            createdAt: receivedAt,
          })),
        });
      }

      await writeAudit(
        { actorId, action: "lead.created", entityType: "Lead", entityId: created.id, summary: `${refCode} created via ${CHANNEL_LABEL[input.channel]} → ${rule}` },
        tx,
      );
      return created;
    },
    { timeout: 20_000 },
  );

  // 8. After commit: notifications + welcome message
  const name = `${firstName} ${lastName ?? ""}`.trim();
  const shortName = `${firstName}${lastName ? ` ${lastName[0]}.` : ""}`;
  const href = `/dashboard/leads/${lead.id}`;
  const notes: Parameters<typeof notify>[0] = [];
  if (ownerId) {
    notes.push(
      sameOwner
        ? { userId: ownerId, type: "RETURNING", title: `Returning enquiry from ${shortName} (${sameOwner.refCode})`, body: `New enquiry ${lead.refCode} linked to your open lead.`, leadId: lead.id, href, dedupeKey: `ASSIGNED:${lead.id}:${ownerId}` }
        : { userId: ownerId, type: "LEAD_ASSIGNED", title: `New lead: ${lead.refCode} ${name}`, body: `${branchLabel ?? ""}${afterHours ? " · after hours" : ""} · first call due ${friendlyIST(firstDue, now)}`, leadId: lead.id, href, dedupeKey: `ASSIGNED:${lead.id}:${ownerId}` },
    );
  }
  for (const uid of queueOwners) {
    if (uid === ownerId) continue;
    if (locationStatus === "OUT_OF_AREA") {
      notes.push({ userId: uid, type: "OUT_OF_AREA", title: `Out-of-area lead: ${lead.refCode} ${name}`, body: explanation[explanation.length - 2] ?? null, leadId: lead.id, href: "/dashboard/queues?tab=out-of-area", dedupeKey: `NEW:${lead.id}:${uid}` });
    } else if (!ownerId) {
      notes.push({ userId: uid, type: "UNASSIGNED", title: `Unassigned lead: ${lead.refCode} ${name}`, body: "Nobody in the branch is available.", leadId: lead.id, href, dedupeKey: `NEW:${lead.id}:${uid}` });
    } else if (settings.notifications.ownerCopiesNewLeads) {
      notes.push({ userId: uid, type: "NEW_LEAD", title: `New lead: ${lead.refCode} ${name}`, body: `→ ${branchLabel}${assignee?.name ? ` · ${assignee.name}` : ""}`, leadId: lead.id, href, dedupeKey: `NEW:${lead.id}:${uid}` });
    }
  }
  await notify(notes);

  if (lead.phoneE164) {
    if (locationStatus === "OUT_OF_AREA" && settings.routing.outOfAreaAction === "AUTO_REGRET") {
      await sendTemplate({ leadId: lead.id, templateCode: "out_of_area_regret", dedupeKey: `REGRET:${lead.id}` });
      await prisma.$transaction([
        prisma.lead.update({ where: { id: lead.id }, data: { stage: "CLOSED_LOST", lostReason: "OTHERS", lostNote: "Out of service area", stageChangedAt: now } }),
        prisma.task.updateMany({ where: { leadId: lead.id, status: "OPEN" }, data: { status: "CANCELLED" } }),
        prisma.activity.create({ data: { leadId: lead.id, type: "STAGE_CHANGE", body: "Closed automatically: out of service area (regret message sent).", createdAt: now } }),
      ]);
    } else if (settings.messaging.autoWelcome && locationStatus !== "OUT_OF_AREA") {
      await sendTemplate({
        leadId: lead.id,
        templateCode: locationStatus === "NEEDS_LOCATION" ? "welcome_no_location" : "welcome_enquiry",
        dedupeKey: `WELCOME:${lead.id}`,
        // Back-dated leads (night scenario, imports) get the welcome right after receipt; live ones "now"
        createdAt: now.getTime() - receivedAt.getTime() > 60_000 ? new Date(receivedAt.getTime() + 4000) : now,
      });
    }
  }

  const toast =
    rule === "RETURNING_SAME_OWNER"
      ? `Returning customer → ${assignee?.name} (same owner as ${sameOwner?.refCode})`
      : locationStatus === "NEEDS_LOCATION"
        ? `Needs location → Online Desk${assignee?.name ? ` (${assignee.name})` : ""}`
        : locationStatus === "OUT_OF_AREA"
          ? `Out of area → manager queue${decision.candidates[0] ? ` (${decision.candidates[0].distanceKm.toFixed(1)} km from ${decision.candidates[0].name})` : ""}`
          : assignee?.userId
            ? `Assigned to ${branchLabel} → ${assignee.name}`
            : `Routed to ${branchLabel} — unassigned`;

  return {
    ok: true,
    lead,
    decision: {
      leadId: lead.id,
      refCode: lead.refCode,
      name,
      rule,
      branchName: branchLabel,
      ownerName: assignee?.name ?? null,
      explanation: [...explanation, ...(assignee?.explanation ?? [])],
      candidates: decision.candidates,
      skipped: assignee?.skipped ?? [],
      toast,
      duplicateOf: duplicateOf?.refCode ?? null,
    },
  };
}
