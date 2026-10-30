import { notFound } from "next/navigation";
import { FeatureBadge } from "@/components/feature-badge";
import { PageHeader } from "@/components/ui";
import { isDemoMode, requirePagePermission } from "@/lib/auth";
import { SCENARIOS } from "@/lib/demo/scenarios";
import { DemoPanel } from "./demo-panel";

export default async function DemoPage() {
  if (!isDemoMode()) notFound();
  await requirePagePermission("demo.use");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Demo panel"
        badge={<FeatureBadge status="LIVE" showLive />}
        description="Each button sends a lead through the real intake path (Meta webhook, website form or manual entry). Only available in demo mode."
      />
      <DemoPanel scenarios={SCENARIOS.map((s) => ({ ...s }))} />
    </div>
  );
}
