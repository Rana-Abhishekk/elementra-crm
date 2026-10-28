import { prisma } from "@/lib/prisma";
import { isDemoMode, requirePageRole } from "@/lib/access";
import { getSettings } from "@/lib/data/settings";
import { PageHeader, Tabs } from "@/components/ui";
import { FeatureBadge } from "@/components/feature-badge";
import { shortBranch } from "@/lib/domain/routing/decide";
import { googleGeocodingEnabled } from "@/lib/domain/geo/providers/google";
import { metaCloudConfigured } from "@/lib/domain/messaging/metaCloud";
import { sheetsConfigured } from "@/lib/domain/integrations/sheets";
import { startOfIstDay } from "@/lib/domain/time";
import { RoutingSettings, HoursSettings, DuplicateSettings } from "./settings-forms";
import { TemplatesEditor } from "./templates-editor";
import { Integrations, type IntegrationCard } from "./integrations";

const TABS = [
  { key: "routing", label: "Routing" },
  { key: "hours", label: "Working hours & SLA" },
  { key: "templates", label: "Templates" },
  { key: "duplicates", label: "Duplicates" },
  { key: "integrations", label: "Integrations" },
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requirePageRole("OWNER", "ADMIN");
  const requested = (await searchParams).tab;
  const tab = TABS.some((t) => t.key === requested) ? requested! : "routing";
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Settings" description="The defaults from the Rules Sheet. Every change is written to the audit log." />
      <Tabs active={tab} tabs={TABS.map((t) => ({ ...t, href: `?tab=${t.key}` }))} />
      {tab === "routing" && <RoutingTab settings={settings} />}
      {tab === "hours" && <HoursSettings settings={settings} />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "duplicates" && <DuplicateSettings settings={settings} />}
      {tab === "integrations" && <IntegrationsTab />}
    </div>
  );
}

async function RoutingTab({ settings }: { settings: Awaited<ReturnType<typeof getSettings>> }) {
  const [branches, rules] = await Promise.all([
    prisma.branch.findMany({ where: { kind: "EXPERIENCE_CENTRE" }, orderBy: { name: "asc" } }),
    prisma.branchPincode.findMany({ include: { branch: { select: { name: true } } }, orderBy: { pincode: "asc" } }),
  ]);
  return (
    <RoutingSettings
      settings={settings}
      googleKey={googleGeocodingEnabled()}
      branches={branches.map((b) => ({ id: b.id, name: shortBranch(b.name), radius: b.serviceRadiusKm, strategy: b.assignmentStrategy }))}
      rules={rules.map((r) => ({ id: r.id, pincode: r.pincode, label: r.label, branch: shortBranch(r.branch.name) }))}
    />
  );
}

async function TemplatesTab() {
  const templates = await prisma.messageTemplate.findMany({ orderBy: [{ code: "asc" }, { language: "asc" }] });
  return <TemplatesEditor templates={templates.map((t) => ({ id: t.id, code: t.code, language: t.language, name: t.name, category: t.category, status: t.status, body: t.body }))} />;
}

async function IntegrationsTab() {
  const weekAgo = startOfIstDay(new Date(), -6);
  const [metaLeads, waMessages, webLeads, sheetLeads] = await Promise.all([
    prisma.lead.count({ where: { intakeChannel: "META_LEAD_AD", createdAt: { gte: weekAgo } } }),
    prisma.outboundMessage.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.lead.count({ where: { intakeChannel: "WEBSITE_FORM", createdAt: { gte: weekAgo } } }),
    prisma.lead.count({ where: { intakeChannel: "GOOGLE_SHEET" } }),
  ]);
  const metaReady = Boolean(process.env.META_APP_SECRET && process.env.META_PAGE_ACCESS_TOKEN);
  const cards: IntegrationCard[] = [
    {
      key: "meta",
      name: "Instagram / Facebook Lead Ads",
      status: metaReady ? "Connected" : "Simulator",
      badge: "F4",
      stat: `${metaLeads} leads via the webhook in the last 7 days`,
      ready: ["Webhook at /api/webhooks/meta/leadgen with the verification handshake", "Signature check (X-Hub-Signature-256) when the app secret is set", "Mapping of your form fields, campaign, ad set and ad", "Duplicate-safe: Meta retries never create a second lead"],
      need: ["Admin access to your Meta Business Manager", "The Facebook Page linked to your lead forms", "App review for the leads_retrieval permission"],
      test: "meta",
    },
    {
      key: "whatsapp",
      name: "WhatsApp Business (Cloud API)",
      status: metaCloudConfigured() ? "Connected" : "Simulator",
      badge: "F22",
      stat: `${waMessages} messages in the simulator in the last 7 days`,
      ready: ["Template messages in English and Hindi", "Automatic welcome, location request and visit reminders", "Delivery ticks (simulated)", "Click-to-chat links work today"],
      need: ["A dedicated WhatsApp Business number", "Meta business verification (7–21 days) — start now", "Template approval (we submit them)"],
    },
    {
      key: "maps",
      name: "Google Maps geocoding",
      status: googleGeocodingEnabled() ? "Connected" : "Awaiting client access",
      badge: "F9",
      stat: "Today: our own Mumbai–Pune locality map (~90 areas) + pincode rules",
      ready: ["Provider coded and tested; used only when the local map can't place an address", "Results are kept on the lead, so each address is geocoded once"],
      need: ["A Google Cloud project with billing in your name", "An API key restricted to the Geocoding API (usage normally stays in the free monthly quota)"],
    },
    {
      key: "sheets",
      name: "Google Sheets sync",
      status: sheetsConfigured() ? "Connected" : "Awaiting client access",
      badge: "F6",
      stat: `${sheetLeads} leads from simulated sheet rows`,
      ready: ["Mapping of your Sales Pipeline columns, including your Source values", "Same routing as every other lead"],
      need: ["Share the sheet with our service account (read-only)"],
      test: isDemoMode() ? "sheets" : undefined,
    },
    {
      key: "website",
      name: "Website enquiry form",
      status: "Connected",
      badge: "F3",
      stat: `${webLeads} website leads in the last 7 days`,
      ready: ["Hosted form at /enquire (mobile-first, branded)", "API for your own website: POST /api/public/leads with the x-api-key header"],
      need: ["Where to link or embed it on your website"],
      test: "website",
    },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Honest status for each connection. <FeatureBadge status="SIMULATED" /> means the full flow runs here; only the call to Meta / Google is simulated until your accounts are connected.
      </p>
      <Integrations cards={cards} demo={isDemoMode()} />
    </div>
  );
}
