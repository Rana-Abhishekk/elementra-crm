import { NextResponse, type NextRequest } from "next/server";
import { processLeadgenPayload, verifyMetaSignature, type LeadgenPayload } from "@/lib/domain/integrations/metaWebhook";

// Meta's subscription handshake: echo hub.challenge when the verify token matches
export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const expected = process.env.META_VERIFY_TOKEN;
  if (p.get("hub.mode") === "subscribe" && expected && p.get("hub.verify_token") === expected) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.META_APP_SECRET;
  if (secret && !verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }
  let payload: LeadgenPayload;
  try {
    payload = JSON.parse(raw) as LeadgenPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (payload.object !== "page") return NextResponse.json({ received: 0 });
  // Simulated (demo) leads are only accepted when no app secret is configured or in demo mode
  const hasSimulated = payload.entry?.some((e) => e.changes?.some((c) => c.value?.simulated_lead));
  if (hasSimulated && secret && process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ error: "Simulated leads are disabled" }, { status: 400 });
  }
  const results = await processLeadgenPayload(payload);
  // Always 200 so Meta doesn't retry forever; failures are reported in the body and logs
  for (const r of results) if (!r.ok) console.error(`Meta leadgen ${r.leadgenId}: ${r.error}`);
  return NextResponse.json({
    received: results.length,
    results: results.map((r) => (r.ok ? { leadgenId: r.leadgenId, ref: r.decision.refCode, result: r.decision.toast } : { leadgenId: r.leadgenId, error: r.error })),
  });
}
