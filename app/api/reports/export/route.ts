import { NextResponse, type NextRequest } from "next/server";
import { getOptionalUser } from "@/lib/auth";
import { isManager } from "@/lib/access";
import { parseReportFilters, reportsData } from "@/lib/data/reports";
import { formatIST } from "@/lib/domain/time";

const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET(req: NextRequest) {
  const user = await getOptionalUser();
  if (!user || !isManager(user)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const f = parseReportFilters(sp);
  const d = await reportsData(user, f);
  let rows: unknown[][];
  if (sp.report === "b") {
    rows = [["Branch", "Count"], ...d.handover.map((h) => [h.label, h.value])];
  } else if (sp.report === "c") {
    rows = [["Branch", "Rep", "Order value (INR)"], ...d.pivotC.flatMap((b) => b.reps.map((r) => [b.branch, r.rep, r.value]))];
  } else {
    rows = [
      ["Status", "Product", ...d.months.map((m) => m.label), "Grand total"],
      ...d.statusTotals.flatMap((g) => g.rows.map((r) => [g.status, r.product, ...d.months.map((m) => r.byMonth[m.key] ?? 0), r.total])),
    ];
  }
  const body = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="elementra-report-${sp.report ?? "a"}-${formatIST(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}
