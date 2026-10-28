import { PrismaClient, Role, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BRANCHES, LOCALITIES, PINCODE_RULES } from "../lib/domain/geo/gazetteer";
import { ARCHITECTS, DEMO_PASSWORD, DEMO_USERS, TEMPLATES } from "../lib/demo/reference";
import { DEFAULT_SETTINGS } from "../lib/domain/settings";

const prisma = new PrismaClient();

// Base data, safe to re-run: admin, branches, pincode rules, localities, demo users, templates, settings
async function main() {
  await seedAdmin();
  const branchIds = await seedBranches();
  await seedLocalities();
  if (process.env.DEMO_MODE === "true") {
    await seedDemoUsers(branchIds);
    await seedArchitects();
  }
  await seedTemplates();
  await seedSettings();
}

// Creates (or resets the password of) the first admin from SEED_ADMIN_* in .env
async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Admin";
  if (!email || !password) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env first.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.ADMIN },
    create: { email, name, passwordHash, role: Role.ADMIN, receivesLeads: false },
  });
  console.log(`Admin ready: ${email}`);
}

async function seedBranches() {
  const ids: Record<string, string> = {};
  for (const b of BRANCHES) {
    const data = {
      name: b.name,
      kind: b.kind,
      city: b.city,
      area: b.area,
      lat: b.lat,
      lng: b.lng,
      serviceRadiusKm: b.serviceRadiusKm,
      assignmentStrategy: b.assignmentStrategy,
    };
    const branch = await prisma.branch.upsert({ where: { code: b.code }, update: {}, create: { code: b.code, ...data } });
    ids[b.code] = branch.id;
  }
  for (const r of PINCODE_RULES) {
    await prisma.branchPincode.upsert({
      where: { pincode: r.pincode },
      update: {},
      create: { pincode: r.pincode, label: r.label, branchId: ids[r.branchCode] },
    });
  }
  console.log(`Branches: ${BRANCHES.length}, pincode rules: ${PINCODE_RULES.length}`);
  return ids;
}

async function seedLocalities() {
  for (const l of LOCALITIES) {
    const data = { pincode: l.pincode, lat: l.lat, lng: l.lng, aliases: l.aliases };
    await prisma.locality.upsert({
      where: { name_city: { name: l.name, city: l.city } },
      update: data,
      create: { name: l.name, city: l.city, ...data },
    });
  }
  console.log(`Localities: ${LOCALITIES.length}`);
}

async function seedDemoUsers(branchIds: Record<string, string>) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of DEMO_USERS) {
    const data = {
      name: u.name,
      role: u.role,
      phone: u.phone,
      branchId: u.branchCode ? branchIds[u.branchCode] : null,
      receivesLeads: u.receivesLeads,
      passwordHash,
      isActive: true,
    };
    await prisma.user.upsert({ where: { email: u.email }, update: data, create: { email: u.email, ...data } });
  }
  console.log(`Demo users: ${DEMO_USERS.length} (password ${DEMO_PASSWORD})`);
}

async function seedArchitects() {
  for (const a of ARCHITECTS) {
    const company =
      (await prisma.company.findFirst({ where: { name: a.firm } })) ??
      (await prisma.company.create({ data: { name: a.firm, kind: "ARCHITECT_FIRM", industry: "Architecture & interiors" } }));
    const existing = await prisma.contact.findFirst({ where: { phoneE164: a.phone } });
    if (!existing) {
      await prisma.contact.create({
        data: {
          kind: "ARCHITECT",
          firstName: a.first,
          lastName: a.last,
          title: `Architect · ${a.commission}% commission`,
          phone: a.phone,
          phoneE164: a.phone,
          email: `${a.first}.${a.last}`.toLowerCase().replace(/[^a-z.]/g, "") + "@example.com",
          companyId: company.id,
        },
      });
    }
  }
  console.log(`Architects: ${ARCHITECTS.length}`);
}

async function seedTemplates() {
  for (const t of TEMPLATES) {
    const variables = [...new Set([...t.body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
    // Create-only: bodies edited in Settings survive a re-seed
    await prisma.messageTemplate.upsert({
      where: { code_language: { code: t.code, language: t.language } },
      update: {},
      create: { ...t, variables },
    });
  }
  console.log(`Templates: ${TEMPLATES.length}`);
}

async function seedSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.appSetting.upsert({ where: { key }, update: {}, create: { key, value: value as Prisma.InputJsonValue } });
  }
  console.log("Settings ready");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
