import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mergeSettings, settingsSchema, type Settings, type SettingsKey } from "@/lib/domain/settings";

export async function getSettings(): Promise<Settings> {
  const rows = await prisma.appSetting.findMany();
  return mergeSettings(rows);
}

export async function setSetting<K extends SettingsKey>(key: K, value: Settings[K], userId?: string) {
  const parsed = settingsSchema.shape[key].parse(value) as Prisma.InputJsonValue;
  await prisma.appSetting.upsert({
    where: { key },
    update: { value: parsed, updatedById: userId },
    create: { key, value: parsed, updatedById: userId },
  });
}
