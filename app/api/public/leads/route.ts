import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Product } from "@prisma/client";
import { ingestLead } from "@/lib/domain/leads/ingest";
import { splitName } from "@/lib/domain/integrations/metaLead";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(200).optional(),
  pincode: z.string().trim().max(10).optional(),
  area: z.string().trim().max(300).optional(),
  products: z.array(z.enum(Product)).optional(),
  message: z.string().trim().max(2000).optional(),
});

// External website forms post here with the x-api-key header
export async function POST(req: NextRequest) {
  const key = process.env.PUBLIC_FORM_API_KEY;
  if (!key || req.headers.get("x-api-key") !== key) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  const b = parsed.data;
  const res = await ingestLead({
    ...splitName(b.name),
    phone: b.phone,
    email: b.email,
    pincode: b.pincode,
    siteAddress: b.area,
    products: b.products,
    notes: b.message ? `Website message: ${b.message}` : null,
    source: "WEBSITE",
    channel: "WEBSITE_FORM",
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 422 });
  return NextResponse.json({ ref: res.lead.refCode, branch: res.decision.branchName, status: res.lead.locationStatus }, { status: 201 });
}
