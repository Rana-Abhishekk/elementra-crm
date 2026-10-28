import { NextResponse, type NextRequest } from "next/server";
import { getOptionalUser } from "@/lib/auth";
import { leadWhere, parseLeadFilters } from "@/lib/data/leads";
import { prisma } from "@/lib/prisma";
import { CHANNEL_LABEL, PRIORITY_LABEL, PRODUCT_LABEL, SOURCE_LABEL } from "@/lib/domain/labels";
import { stageLabel } from "@/lib/domain/stages";
import { formatIST } from "@/lib/domain/time";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Neutralise spreadsheet formulas and quote everything
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

// CSV of the leads the signed-in user can see, with the same filters as the Leads page
export async function GET(req: NextRequest) {
  const user = await getOptionalUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filters = parseLeadFilters(Object.fromEntries(req.nextUrl.searchParams));
  filters.view ??= "all";
  const leads = await prisma.lead.findMany({
    where: leadWhere(user, filters),
    include: { branch: { select: { name: true } }, owner: { select: { name: true } }, locality: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  const header = ["Ref", "Entry date", "Status", "Salutation", "First name", "Last name", "Phone", "Email", "Site address", "Area", "Pincode", "Branch", "Owner", "Products", "Order value (INR)", "Estimated value (INR)", "Source", "Channel", "Campaign", "Ad set", "Ad", "Priority", "Next follow-up"];
  const lines = leads.map((l) =>
    [
      l.refCode,
      formatIST(l.createdAt, "dd-MM-yyyy HH:mm"),
      stageLabel(l.stage, l.lostReason),
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
      l.products.map((p) => PRODUCT_LABEL[p]).join(", "),
      l.orderValueInr,
      l.estimatedValueInr,
      SOURCE_LABEL[l.source],
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
