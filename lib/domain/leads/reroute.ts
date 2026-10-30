// Re-routing an existing lead: capture location (Online Desk), "Re-run routing" after an address edit,
// accepting an out-of-area lead for a branch, and manual reassignment. Every change is explained on the timeline.
import type { Prisma, RoutingRule } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/domain/audit";
import { notify } from "@/lib/domain/notify";
import { resolveLocation } from "@/lib/domain/geo/resolve";
import { decideBranch, shortBranch } from "@/lib/domain/routing/decide";
import { pickAssignee, type AssigneePick } from "@/lib/domain/routing/assign";
import { addWorkingMinutes, friendlyIST } from "@/lib/domain/time";
import { loadMembers, loadRoutingContext } from "./context";

export interface RerouteResult {
  ok: true;
  rule: RoutingRule;
  branchName: string | null;
  ownerName: string | null;
  explanation: string[];
  toast: string;
}

type Fail = { ok: false; error: string };

export async function rerouteLead(
  leadId: string,
  input: { siteAddress?: string | null; pincode?: string | null; forceBranchId?: string | null; ownerId?: string | null },
  actorId: string | null,
  now = new Date(),
): Promise<RerouteResult | Fail> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { branch: true, owner: true, stage: { select: { isInitial: true } } } });
  if (!lead) return { ok: false, error: "Lead not found" };
  const ctx = await loadRoutingContext();
  const actor = actorId ? await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } }) : null;

  const siteAddress = input.siteAddress !== undefined ? input.siteAddress : lead.siteAddressRaw;
  const pincode = input.pincode !== undefined ? input.pincode : lead.pincode;
  const loc = resolveLocation({ siteAddress, pincode }, ctx.localities, { fuzzyThreshold: ctx.settings.geo.fuzzyThreshold });

  let decision = decideBranch(loc, ctx.branches, ctx.rules, "DIRECT");
  let rule: RoutingRule = decision.rule;
  // A manager's explicit choice replaces the "parked in the queue" conclusion
  const explanation = decision.explanation.filter((l) => !(input.forceBranchId && l.startsWith("Outside the service area")));

  if (input.forceBranchId) {
    const forced = ctx.branches.find((b) => b.id === input.forceBranchId);
    if (!forced) return { ok: false, error: "Branch not found" };
    rule = "MANUAL";
    explanation.push(`${actor?.name ?? "A manager"} accepted this lead for ${shortBranch(forced.name)}.`);
    decision = { ...decision, branchId: forced.id };
  }

  const locationFields = {
    siteAddressRaw: siteAddress ?? null,
    pincode: loc.pincode,
    localityId: (loc.locality as { id?: string } | null)?.id ?? null,
    city: loc.locality?.city ?? lead.city,
    lat: loc.lat,
    lng: loc.lng,
    geoMethod: loc.method,
    geoConfidence: loc.confidence,
  };

  // Still no usable location / out of area: record the attempt and keep it in its queue
  if (!input.forceBranchId && (decision.rule === "NEEDS_LOCATION" || decision.rule === "OUT_OF_AREA")) {
    const toOutOfArea = decision.rule === "OUT_OF_AREA";
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          ...locationFields,
          locationStatus: toOutOfArea ? "OUT_OF_AREA" : "NEEDS_LOCATION",
          ...(toOutOfArea ? { ownerId: null, branchId: null, nextFollowUpAt: null } : {}),
        },
      });
      if (toOutOfArea) await tx.task.updateMany({ where: { leadId: lead.id, status: "OPEN" }, data: { status: "CANCELLED" } });
      await logDecision(tx, lead.id, loc, rule, decision, null, explanation, actorId, now);
      await tx.activity.create({ data: { leadId: lead.id, type: "ROUTING", body: explanation.join("\n"), userId: actorId, createdAt: now } });
    });
    return {
      ok: true,
      rule,
      branchName: null,
      ownerName: null,
      explanation,
      toast: toOutOfArea ? "Out of area → moved to the manager queue" : "Still no usable location — try a pincode or a known area",
    };
  }

  const branch = ctx.branches.find((b) => b.id === decision.branchId)!;
  const branchName = branch.kind === "ONLINE_DESK" ? "Online Desk" : shortBranch(branch.name);
  const members = await loadMembers(branch.id);

  // Keep the current owner when they already belong to the target branch (e.g. a small address correction)
  let assignee: AssigneePick;
  const keep = lead.owner && lead.owner.branchId === branch.id && lead.owner.isActive && !input.ownerId;
  if (input.ownerId) {
    const m = members.find((x) => x.id === input.ownerId) ?? (await prisma.user.findUnique({ where: { id: input.ownerId } }));
    if (!m) return { ok: false, error: "User not found" };
    assignee = { userId: m.id, name: m.name, strategy: branch.assignmentStrategy, skipped: [], fallback: null, explanation: [`${actor?.name ?? "A manager"} chose ${m.name}.`] };
  } else if (keep) {
    assignee = { userId: lead.owner!.id, name: lead.owner!.name, strategy: branch.assignmentStrategy, skipped: [], fallback: null, explanation: [`Stays with ${lead.owner!.name} (already in ${branchName}).`] };
  } else {
    assignee = pickAssignee(branchName, branch.assignmentStrategy, members, now);
  }

  const fromOnlineDesk = lead.branch?.kind === "ONLINE_DESK" || lead.locationStatus === "NEEDS_LOCATION";
  const ownerChanged = assignee.userId !== lead.ownerId;
  const isHandover = fromOnlineDesk && branch.kind === "EXPERIENCE_CENTRE";
  const due = addWorkingMinutes(now, ctx.settings.sla.firstContactMins, ctx.settings.workingHours);

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: lead.id },
      data: {
        ...locationFields,
        locationStatus: "RESOLVED",
        branchId: branch.id,
        ownerId: assignee.userId,
        ...(ownerChanged ? { assignedAt: now } : {}),
        ...(isHandover ? { handedOverById: actorId ?? lead.ownerId, handedOverAt: now } : {}),
        ...(ownerChanged && assignee.userId ? { nextFollowUpAt: due } : {}),
      },
    });
    await logDecision(tx, lead.id, loc, rule, decision, assignee, explanation, actorId, now);
    await tx.activity.create({ data: { leadId: lead.id, type: "ROUTING", body: explanation.join("\n"), userId: actorId, createdAt: now } });
    if (ownerChanged || isHandover) {
      const who = actor?.name ? ` by ${actor.name}` : "";
      await tx.activity.create({
        data: {
          leadId: lead.id,
          type: isHandover ? "HANDOVER" : "ASSIGNMENT",
          body: [
            isHandover ? `Handed over to ${branchName} → ${assignee.name ?? "unassigned"}${who}.` : `Assigned to ${assignee.name ?? "nobody"} (${branchName})${who}.`,
            ...assignee.explanation,
          ].join("\n"),
          userId: actorId,
          meta: { userId: assignee.userId },
          createdAt: new Date(now.getTime() + 10),
        },
      });
      // Queue tasks are done; the new owner gets a call task
      await tx.task.updateMany({
        where: { leadId: lead.id, status: "OPEN", type: { in: ["CAPTURE_LOCATION", "OUT_OF_AREA_REVIEW", "FIRST_CALL"] } },
        data: { status: "DONE", completedAt: now },
      });
      if (assignee.userId) {
        await tx.task.create({
          data: {
            leadId: lead.id,
            assigneeId: assignee.userId,
            type: lead.stage.isInitial ? "FIRST_CALL" : "FOLLOW_UP",
            title: isHandover ? `Call ${lead.firstName} — handed over from the Online Desk` : `Call ${lead.firstName} — newly assigned to you`,
            dueAt: due,
            createdById: actorId,
          },
        });
        await tx.user.update({ where: { id: assignee.userId }, data: { lastAssignedAt: now } });
      }
    }
    await writeAudit(
      {
        actorId,
        action: isHandover ? "lead.handed_over" : ownerChanged ? "lead.reassigned" : "lead.rerouted",
        entityType: "Lead",
        entityId: lead.id,
        summary: `${lead.refCode} → ${branchName}${assignee.name ? ` / ${assignee.name}` : ""} (${rule})`,
      },
      tx,
    );
  });

  if (ownerChanged && assignee.userId && assignee.userId !== actorId) {
    await notify({
      userId: assignee.userId,
      type: isHandover ? "HANDOVER" : "LEAD_ASSIGNED",
      title: `${isHandover ? "Handed over to you" : "Assigned to you"}: ${lead.refCode} ${lead.firstName} ${lead.lastName ?? ""}`.trim(),
      body: `Call due ${friendlyIST(due, now)}`,
      leadId: lead.id,
      href: `/dashboard/leads/${lead.id}`,
      dedupeKey: `ASSIGNED:${lead.id}:${assignee.userId}:${now.getTime()}`,
    });
  }

  const target = `${branchName}${assignee.name ? ` → ${assignee.name}` : ""}`;
  return {
    ok: true,
    rule,
    branchName,
    ownerName: assignee.name,
    explanation: [...explanation, ...assignee.explanation],
    toast: isHandover ? `Handed over to ${target}` : ownerChanged ? `Assigned to ${target}` : `Re-routed: ${target}`,
  };
}

async function logDecision(
  tx: Prisma.TransactionClient,
  leadId: string,
  loc: ReturnType<typeof resolveLocation>,
  rule: RoutingRule,
  decision: ReturnType<typeof decideBranch>,
  assignee: AssigneePick | null,
  explanation: string[],
  actorId: string | null,
  now: Date,
) {
  await tx.routingDecision.create({
    data: {
      leadId,
      inputText: loc.inputText || null,
      geoMethod: loc.method,
      geoConfidence: loc.confidence,
      matchedLabel: loc.label,
      rule,
      distanceKm: decision.distanceKm,
      candidates: decision.candidates as unknown as Prisma.InputJsonValue,
      chosenBranchId: decision.branchId,
      chosenUserId: assignee?.userId ?? null,
      strategy: assignee?.strategy ?? null,
      skipped: (assignee?.skipped ?? []) as unknown as Prisma.InputJsonValue,
      explanation: [...explanation, ...(assignee?.explanation ?? [])],
      actorId,
      createdAt: now,
    },
  });
}
