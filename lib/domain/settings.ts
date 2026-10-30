import { z } from "zod";

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);

export const settingsSchema = z.object({
  routing: z.object({
    mode: z.enum(["DIRECT", "VIA_PRESALES"]),
    outOfAreaAction: z.enum(["MANAGER_QUEUE", "AUTO_REGRET", "ASSIGN_LOW_PRIORITY"]),
    productRuleEnabled: z.boolean(),
  }),
  geo: z.object({
    provider: z.enum(["LOCAL", "GOOGLE"]),
    fuzzyThreshold: z.number().min(0.5).max(1),
  }),
  // One open lead per phone number is enforced by the database; windowDays = how far back a closed
  // enquiry still marks the new lead as a returning customer.
  duplicates: z.object({
    windowDays: z.number().int().min(1).max(3650),
  }),
  workingHours: z.object({
    tz: z.string(),
    days: z.array(z.number().int().min(0).max(6)),
    open: hhmm,
    close: hhmm,
  }),
  sla: z.object({
    firstContactMins: z.number().int().min(1),
    escalateMins: z.number().int().min(1),
  }),
  reminders: z.object({
    appointmentHours: z.number().int().min(1),
    noResponseCalls: z.number().int().min(1),
    digestTime: hhmm,
    disabledRules: z.array(z.string()).default([]),
  }),
  messaging: z.object({
    autoWelcome: z.boolean(),
    defaultLanguage: z.enum(["en", "hi"]),
    provider: z.enum(["SIMULATOR", "META_CLOUD"]),
  }),
  notifications: z.object({
    ownerCopiesNewLeads: z.boolean(),
  }),
});

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsKey = keyof Settings;

// 02_REFERENCE_DATA §11
export const DEFAULT_SETTINGS: Settings = {
  routing: { mode: "DIRECT", outOfAreaAction: "MANAGER_QUEUE", productRuleEnabled: false },
  geo: { provider: "LOCAL", fuzzyThreshold: 0.88 },
  duplicates: { windowDays: 180 },
  workingHours: { tz: "Asia/Kolkata", days: [0, 1, 2, 3, 4, 5, 6], open: "10:00", close: "19:30" },
  sla: { firstContactMins: 60, escalateMins: 240 },
  reminders: {
    appointmentHours: 24,
    noResponseCalls: 3,
    digestTime: "09:30",
    disabledRules: [],
  },
  messaging: { autoWelcome: true, defaultLanguage: "en", provider: "SIMULATOR" },
  notifications: { ownerCopiesNewLeads: true },
};

/** Merge stored rows over defaults; invalid stored sections fall back to defaults. */
export function mergeSettings(rows: { key: string; value: unknown }[]): Settings {
  const out = structuredClone(DEFAULT_SETTINGS) as Record<string, unknown>;
  for (const row of rows) {
    if (!(row.key in DEFAULT_SETTINGS)) continue;
    const key = row.key as SettingsKey;
    const section = settingsSchema.shape[key].safeParse({
      ...(DEFAULT_SETTINGS[key] as object),
      ...(row.value as object),
    });
    if (section.success) out[key] = section.data;
  }
  return out as Settings;
}
