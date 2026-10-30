import { NextResponse, type NextRequest } from "next/server";
import { can, getCurrentUser } from "@/lib/auth";
import { leadFilterWhere, parseLeadFilters } from "@/lib/data/leads";
import { prisma } from "@/lib/prisma";
import { CHANNEL_LABEL, PRIORITY_LABEL } from "@/lib/domain/labels";
import { formatIST } from "@/lib/domain/time";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Neutralise spreadsheet formulas and quote everything
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

// CSV of the leads the signed-in user can see, with the same filters as the Leads page
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user, "leads.export")) return NextResponse.json({ error: "You don't have permission to export leads." }, { status: 403 });
  const filters = parseLeadFilters(Object.fromEntries(req.nextUrl.searchParams));
  filters.view ??= "all";
  const leads = await prisma.lead.findMany({
    where: leadFilterWhere(user, filters),
    include: {
      branch: { select: { name: true } },
      owner: { select: { name: true } },
      locality: { select: { name: true } },
      stage: { select: { label: true } },
      pipeline: { select: { name: true } },
      source: { select: { name: true } },
      products: { select: { name: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  const header = ["Ref", "Entry date", "Pipeline", "Status", "Salutation", "First name", "Last name", "Phone", "Email", "Site address", "Area", "Pincode", "Branch", "Owner", "Products", "Order value (INR)", "Estimated value (INR)", "Source", "Channel", "Campaign", "Ad set", "Ad", "Priority", "Next follow-up"];
  const lines = leads.map((l) =>
    [
      l.refCode,
      formatIST(l.createdAt, "dd-MM-yyyy HH:mm"),
      l.pipeline.name,
      l.stage.label,
      l.salutation,
      l.firstName,
      l.lastName,
      l.phoneE164,
      l.email,
      l.siteAddressRaw,
      l.locality?.name,
      l.pincode,
      l.branch?.name ?? (l.locationStatus === "OUT_OF_AREA" ? "Out of area" : ""),
      l.owner?.name,
      l.products.map((p) => p.name).join(", "),
      l.orderValueInr,
      l.estimatedValueInr,
      l.source.name,
      CHANNEL_LABEL[l.intakeChannel],
      l.campaignName,
      l.adsetName,
      l.adName,
      PRIORITY_LABEL[l.priority],
      l.nextFollowUpAt ? formatIST(l.nextFollowUpAt, "dd-MM-yyyy HH:mm") : "",
    ]
      .map(csvCell)
      .join(","),
  );
  const body = "﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="elementra-leads-${formatIST(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}
