import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { leadWhereForUser } from "@/lib/access";
import { FeatureBadge } from "@/components/feature-badge";
import { PageHeader } from "@/components/ui";
import { shortBranch } from "@/lib/domain/routing/decide";
import { isOpenStage } from "@/lib/domain/stages";
import { MapView } from "./map-view";

// One colour per branch (validated categorical slots 1–4); names are always shown as labels too
const BRANCH_COLOR: Record<string, string> = { WOR: "#2a78d6", AND: "#eb6834", TAR: "#1baf7a", PUN: "#eda100" };

export default async function MapPage() {
  const user = await requireUser();
  const [branches, leads] = await Promise.all([
    prisma.branch.findMany({ where: { kind: "EXPERIENCE_CENTRE", isActive: true }, orderBy: { name: "asc" } }),
    prisma.lead.findMany({
      where: { AND: [leadWhereForUser(user), { lat: { not: null } }] },
      select: { id: true, refCode: true, firstName: true, lat: true, lng: true, stage: true, locationStatus: true, locality: { select: { name: true } }, branch: { select: { code: true } } },
      orderBy: { createdAt: "desc" },
      take: 600,
    }),
  ]);
  // Several leads share a locality centroid — fan them out slightly so pins don't stack
  const jitter = (id: string, k: number) => ((parseInt(id.slice(-4 - k, -k || undefined), 36) % 100) - 50) / 12000;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Map"
        badge={<FeatureBadge feature="F27" />}
        description="Preview map on OpenStreetMap. Google Maps switches on when your API key is added."
      />
      <MapView
        branches={branches.map((b) => ({ code: b.code, name: shortBranch(b.name), lat: b.lat!, lng: b.lng!, radiusKm: b.serviceRadiusKm, color: BRANCH_COLOR[b.code] ?? "#64748b" }))}
        pins={leads.map((l) => ({
          id: l.id,
          lat: l.lat! + jitter(l.id, 0),
          lng: l.lng! + jitter(l.id, 4),
          label: `${l.refCode} · ${l.firstName} · ${l.locality?.name ?? ""}`,
          group: l.locationStatus === "OUT_OF_AREA" ? "ooa" : l.stage === "CLOSED_WON" ? "won" : isOpenStage(l.stage) ? "open" : "lost",
          branchCode: l.branch?.code ?? null,
        }))}
      />
    </div>
  );
}
