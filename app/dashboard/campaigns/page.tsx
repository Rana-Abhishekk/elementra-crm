import { ChevronRight, Megaphone } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leadWhereForUser, requirePageRole } from "@/lib/access";
import { Card, EmptyState, PageHeader, Tabs } from "@/components/ui";
import { FeatureBadge } from "@/components/feature-badge";
import { formatINR, formatLakh } from "@/lib/domain/money";
import { STAGE_ORDER, STAGE_SHORT } from "@/lib/domain/stages";
import { shortBranch } from "@/lib/domain/routing/decide";
import { SpendInput } from "./spend-input";

interface Agg {
  leads: number;
  located: number;
  qualified: number;
  visits: number;
  won: number;
  wonValue: number;
}
const empty = (): Agg => ({ leads: 0, located: 0, qualified: 0, visits: 0, won: 0, wonValue: 0 });
const qualifiedIdx = STAGE_ORDER.indexOf("QUALIFIED");

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageRole("OWNER", "ADMIN", "SALES_MANAGER");
  const sp = await searchParams;
  const tab = sp.tab === "broadcasts" ? "broadcasts" : "performance";
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Campaigns" description="Which Instagram / Facebook campaign and which ad brings leads that actually visit and buy — not just leads." />
      <Tabs
        active={tab}
        tabs={[
          { key: "performance", label: "Performance", href: "?tab=performance" },
          { key: "broadcasts", label: <span className="inline-flex items-center gap-1.5">Broadcasts <FeatureBadge feature="F46" /></span>, href: "?tab=broadcasts" },
        ]}
      />
      {tab === "performance" ? <Performance where={leadWhereForUser(user)} /> : <Broadcasts where={leadWhereForUser(user)} sp={sp} />}
    </div>
  );
}

async function Performance({ where }: { where: Prisma.LeadWhereInput }) {
  const [leads, spendRow] = await Promise.all([
    prisma.lead.findMany({
      where: { AND: [where, { campaignName: { not: null } }] },
      select: { campaignName: true, adsetName: true, adName: true, stage: true, locationStatus: true, orderValueInr: true, appointments: { where: { status: "VISITED" }, select: { id: true } } },
    }),
    prisma.appSetting.findUnique({ where: { key: "campaign.spend" } }),
  ]);
  const spend = (spendRow?.value as Record<string, number> | null) ?? {};
  if (!leads.length) {
    return (
      <Card>
        <EmptyState icon={Megaphone} title="No campaign leads yet">Leads from Meta lead ads carry their campaign, ad set and ad automatically.</EmptyState>
      </Card>
    );
  }
  const tree = new Map<string, { agg: Agg; sets: Map<string, { agg: Agg; ads: Map<string, Agg> }> }>();
  const add = (a: Agg, l: (typeof leads)[number]) => {
    a.leads++;
    if (l.locationStatus === "RESOLVED") a.located++;
    if (STAGE_ORDER.indexOf(l.stage) >= qualifiedIdx && l.stage !== "CLOSED_LOST") a.qualified++;
    a.visits += l.appointments.length ? 1 : 0;
    if (l.stage === "CLOSED_WON") {
      a.won++;
      a.wonValue += l.orderValueInr ?? 0;
    }
  };
  for (const l of leads) {
    const c = tree.get(l.campaignName!) ?? { agg: empty(), sets: new Map() };
    tree.set(l.campaignName!, c);
    const s = c.sets.get(l.adsetName ?? "—") ?? { agg: empty(), ads: new Map() };
    c.sets.set(l.adsetName ?? "—", s);
    const ad = s.ads.get(l.adName ?? "—") ?? empty();
    s.ads.set(l.adName ?? "—", ad);
    add(c.agg, l);
    add(s.agg, l);
    add(ad, l);
  }
  const campaigns = [...tree.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="p-3 text-left">Campaign → ad set → ad</th>
            <th className="p-3 text-right">Leads</th>
            <th className="p-3 text-right">With location</th>
            <th className="p-3 text-right">Qualified</th>
            <th className="p-3 text-right">Visits</th>
            <th className="p-3 text-right">Won</th>
            <th className="p-3 text-right">Won ₹</th>
            <th className="p-3 text-right">Spend ₹</th>
            <th className="p-3 text-right">Cost / lead</th>
          </tr>
        </thead>
        {campaigns.map(([name, c]) => (
          <tbody key={name} className="border-t-2 border-slate-100">
            <Row label={name} a={c.agg} level={0} spend={spend[name]} campaign={name} />
            {[...c.sets.entries()]
              .sort((a, b) => b[1].agg.leads - a[1].agg.leads)
              .flatMap(([set, s]) => [
                <Row key={set} label={set} a={s.agg} level={1} />,
                ...[...s.ads.entries()].sort((a, b) => b[1].leads - a[1].leads).map(([ad, a]) => <Row key={`${set}-${ad}`} label={ad} a={a} level={2} />),
              ])}
          </tbody>
        ))}
      </table>
      <p className="px-4 py-3 text-xs text-slate-500">Spend is entered by hand for now; with Meta Marketing API access it can be pulled automatically.</p>
    </Card>
  );
}

function Row({ label, a, level, spend, campaign }: { label: string; a: Agg; level: 0 | 1 | 2; spend?: number; campaign?: string }) {
  const pct = (n: number) => (a.leads ? `${Math.round((n / a.leads) * 100)}%` : "—");
  return (
    <tr className={level === 0 ? "bg-slate-50/60 font-medium" : "text-slate-600"}>
      <td className="p-2.5" style={{ paddingLeft: 12 + level * 20 }}>
        <span className="inline-flex items-center gap-1">
          {level > 0 && <ChevronRight className="size-3 text-slate-300" />}
          {label}
        </span>
      </td>
      <td className="p-2.5 text-right">{a.leads}</td>
      <td className="p-2.5 text-right">{pct(a.located)}</td>
      <td className="p-2.5 text-right">
        {a.qualified} <span className="text-xs text-slate-400">({pct(a.qualified)})</span>
      </td>
      <td className="p-2.5 text-right">{a.visits}</td>
      <td className="p-2.5 text-right">{a.won}</td>
      <td className="p-2.5 text-right" title={formatINR(a.wonValue)}>
        {a.wonValue ? formatLakh(a.wonValue) : "—"}
      </td>
      <td className="p-2.5 text-right">{campaign ? <SpendInput campaign={campaign} value={spend ?? 0} /> : ""}</td>
      <td className="p-2.5 text-right">{level === 0 && spend ? formatINR(Math.round(spend / Math.max(a.leads, 1))) : ""}</td>
    </tr>
  );
}

async function Broadcasts({ where, sp }: { where: Prisma.LeadWhereInput; sp: Record<string, string | undefined> }) {
  const [branches, templates] = await Promise.all([
    prisma.branch.findMany({ where: { kind: "EXPERIENCE_CENTRE" }, orderBy: { name: "asc" } }),
    prisma.messageTemplate.findMany({ where: { category: "MARKETING" }, select: { code: true, name: true, language: true, status: true } }),
  ]);
  const days = Number(sp.days ?? 60);
  const filters: Prisma.LeadWhereInput[] = [where, { stage: (sp.stage as Prisma.EnumLeadStageFilter["equals"]) ?? "QUALIFIED" }, { phoneE164: { not: null } }];
  if (sp.branch) filters.push({ branchId: sp.branch });
  if (days) filters.push({ possessionDate: { gte: new Date(), lte: new Date(new Date().getTime() + days * 86400_000) } });
  const audience = await prisma.lead.count({ where: { AND: filters } });

  return (
    <Card className="p-5">
      <form className="grid gap-4 sm:grid-cols-4">
        <label className="text-sm">
          <span className="label">Stage</span>
          <select name="stage" defaultValue={sp.stage ?? "QUALIFIED"} className="field">
            {STAGE_ORDER.slice(0, 8).map((s) => (
              <option key={s} value={s}>
                {STAGE_SHORT[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label">Possession within</span>
          <select name="days" defaultValue={String(days)} className="field">
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
            <option value="0">Any time</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="label">Branch</span>
          <select name="branch" defaultValue={sp.branch ?? ""} className="field">
            <option value="">All</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {shortBranch(b.name)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label">Template</span>
          <select name="template" defaultValue={sp.template ?? templates[0]?.code} className="field">
            {templates.map((t) => (
              <option key={`${t.code}-${t.language}`} value={t.code}>
                {t.name} ({t.language})
              </option>
            ))}
          </select>
        </label>
        <input type="hidden" name="tab" value="broadcasts" />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
          <button className="btn-secondary">Preview audience</button>
          <span className="text-sm">
            <span className="text-2xl font-semibold text-ink">{audience}</span> people match
          </span>
          <button className="btn ml-auto" disabled title="Broadcasts need the WhatsApp Business API and an approved marketing template">
            Send broadcast
          </button>
        </div>
      </form>
      <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        Sending is switched off. WhatsApp marketing broadcasts need the Business API, an approved marketing template and opt-in tracking. The segment builder and audience count work today.
      </p>
    </Card>
  );
}
