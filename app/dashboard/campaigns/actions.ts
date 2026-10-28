"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";

/** Manual ad spend per campaign (₹) — optional, used for cost per lead. */
export async function saveCampaignSpendAction(campaign: string, rupees: string) {
  await requireRole("OWNER", "ADMIN", "SALES_MANAGER");
  const value = z.coerce.number().int().min(0).parse(rupees || 0);
  const row = await prisma.appSetting.findUnique({ where: { key: "campaign.spend" } });
  const spend = { ...((row?.value as Record<string, number> | null) ?? {}), [campaign]: value };
  await prisma.appSetting.upsert({ where: { key: "campaign.spend" }, update: { value: spend as Prisma.InputJsonValue }, create: { key: "campaign.spend", value: spend as Prisma.InputJsonValue } });
  revalidatePath("/dashboard/campaigns");
  return { ok: true as const, message: "Spend saved" };
}
