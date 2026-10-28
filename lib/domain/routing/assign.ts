// pickAssignee(): who inside the branch gets the lead (spec §8.4). Pure.
import type { AssignmentStrategy, Role } from "@prisma/client";
import { formatISTDate } from "@/lib/domain/time";

export interface Member {
  id: string;
  name: string;
  role: Role;
  isActive: boolean;
  receivesLeads: boolean;
  onLeave: boolean;
  onLeaveUntil: Date | null;
  lastAssignedAt: Date | null;
  openLeads: number;
}

export interface Skipped {
  userId: string;
  name: string;
  reason: string;
}

export interface AssigneePick {
  userId: string | null;
  name: string | null;
  strategy: AssignmentStrategy;
  skipped: Skipped[];
  fallback: "MANAGER" | "UNASSIGNED" | null;
  explanation: string[];
}

export function isOnLeave(m: Pick<Member, "onLeave" | "onLeaveUntil">, now: Date): boolean {
  return m.onLeave && (!m.onLeaveUntil || m.onLeaveUntil.getTime() > now.getTime());
}

const firstName = (n: string) => n.split(" ")[0];
const ts = (d: Date | null) => (d ? d.getTime() : -Infinity);

export function pickAssignee(branchName: string, strategy: AssignmentStrategy, members: Member[], now: Date): AssigneePick {
  const skipped: Skipped[] = [];
  const eligible: Member[] = [];
  for (const m of members) {
    if (!m.receivesLeads) continue;
    if (!m.isActive) {
      skipped.push({ userId: m.id, name: m.name, reason: "inactive" });
    } else if (isOnLeave(m, now)) {
      skipped.push({ userId: m.id, name: m.name, reason: m.onLeaveUntil ? `on leave until ${formatISTDate(m.onLeaveUntil)}` : "on leave" });
    } else {
      eligible.push(m);
    }
  }
  const skippedLine = skipped.length ? [`Skipped: ${skipped.map((s) => `${s.name} (${s.reason})`).join(", ")}.`] : [];

  if (!eligible.length) {
    const manager = members.find((m) => m.role === "SALES_MANAGER" && m.isActive && !isOnLeave(m, now));
    if (manager) {
      return {
        userId: manager.id,
        name: manager.name,
        strategy,
        skipped,
        fallback: "MANAGER",
        explanation: [...skippedLine, `Nobody in ${branchName} is available → assigned to the branch manager, ${manager.name}.`],
      };
    }
    return {
      userId: null,
      name: null,
      strategy,
      skipped,
      fallback: "UNASSIGNED",
      explanation: [...skippedLine, `Nobody in ${branchName} is available → left in the Unassigned queue; the owner is notified.`],
    };
  }

  const byRoundRobin = (a: Member, b: Member) => ts(a.lastAssignedAt) - ts(b.lastAssignedAt) || a.name.localeCompare(b.name);
  const sorted =
    strategy === "LEAST_OPEN_LEADS" ? [...eligible].sort((a, b) => a.openLeads - b.openLeads || byRoundRobin(a, b)) : [...eligible].sort(byRoundRobin);
  const chosen = sorted[0];
  const others = sorted.slice(1);

  const line =
    strategy === "LEAST_OPEN_LEADS"
      ? `Fewest open leads in ${branchName}: ${chosen.name} (${chosen.openLeads} open${others.length ? `; ${others.map((o) => `${firstName(o.name)} ${o.openLeads}`).join(", ")}` : ""}).`
      : `Round-robin in ${branchName}: ${chosen.name} is next${others.length ? ` (then ${others.map((o) => firstName(o.name)).join(", ")})` : ""}.`;

  return { userId: chosen.id, name: chosen.name, strategy, skipped, fallback: null, explanation: [line, ...skippedLine] };
}
