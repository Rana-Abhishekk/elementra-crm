import { NextResponse, type NextRequest } from "next/server";
import { runReminderEngine } from "@/lib/domain/reminders/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron (and `npm run cron:dev`) call this with Authorization: Bearer $CRON_SECRET
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runReminderEngine();
  return NextResponse.json(summary);
}
