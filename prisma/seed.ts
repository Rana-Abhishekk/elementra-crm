import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BRANCHES, LOCALITIES, PINCODE_RULES } from "../lib/domain/geo/gazetteer";
import { ARCHITECTS, DEMO_PASSWORD, DEMO_USERS, TEMPLATES } from "../lib/demo/reference";
import { DEFAULT_SETTINGS } from "../lib/domain/settings";
import { PIPELINES, PRODUCTS, ROLES, SOURCES, SUPER_ADMIN_ROLE } from "../lib/domain/masters/defaults";

const prisma = new PrismaClient();

// Base data, safe to re-run: masters (roles, sources, products, pipelines), admin, branches, pincode rules,
// localities, demo users, templates, settings. Masters are create-only: an admin's edits survive a re-seed.
async function main() {
  await seedRoles();
  await seedSources();
  await seedProducts();
  await seedPipelines();
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
  const role = await prisma.role.findUniqueOrThrow({ where: { name: SUPER_ADMIN_ROLE } });
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, roleId: role.id, isActive: true },
    create: { email, name, passwordHash, roleId: role.id, receivesLeads: false, designation: "Administrator" },
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
  const roles = Object.fromEntries((await prisma.role.findMany()).map((r) => [r.name, r.id]));
  for (const u of DEMO_USERS) {
    if (!roles[u.role]) throw new Error(`Role "${u.role}" missing — seedRoles() runs first.`);
    const data = {
      name: u.name,
      roleId: roles[u.role],
      phone: u.phone,
      branchId: u.branchCode ? branchIds[u.branchCode] : null,
      extraBranches: { set: (u.extraBranchCodes ?? []).map((c) => ({ id: branchIds[c] })) },
      receivesLeads: u.receivesLeads,
      employeeCode: u.employeeCode,
      designation: u.designation,
      passwordHash,
      isActive: true,
      deactivatedAt: null,
      mustChangePassword: false,
    };
    await prisma.user.upsert({
      where: { email: u.email },
      update: data,
      create: { email: u.email, ...data, extraBranches: { connect: (u.extraBranchCodes ?? []).map((c) => ({ id: branchIds[c] })) } },
    });
  }
  // Line managers (display only)
  for (const u of DEMO_USERS.filter((x) => x.reportsTo)) {
    const boss = await prisma.user.findUnique({ where: { email: u.reportsTo! }, select: { id: true } });
    await prisma.user.update({ where: { email: u.email }, data: { reportsToId: boss?.id ?? null } });
  }
  console.log(`Demo users: ${DEMO_USERS.length} (password ${DEMO_PASSWORD})`);
}

// ---------- masters (fixed ids, so the Week 1 migration's rows and these are the same rows) ----------

async function seedRoles() {
  for (const r of ROLES) {
    const existing = await prisma.role.findFirst({ where: { OR: [{ id: r.id }, { name: r.name }] } });
    if (existing) {
      // The locked Super Admin always holds every permission (new permissions added in code included)
      if (r.isLocked) await prisma.role.update({ where: { id: existing.id }, data: { permissions: r.permissions, scope: r.scope, isLocked: true, isSystem: true } });
      continue;
    }
    await prisma.role.create({ data: { id: r.id, name: r.name, description: r.description, scope: r.scope, permissions: r.permissions, isSystem: true, isLocked: !!r.isLocked } });
  }
  console.log(`Roles: ${ROLES.length}`);
}

async function seedSources() {
  for (const [i, s] of SOURCES.entries()) {
    if (await prisma.source.findFirst({ where: { OR: [{ id: s.id }, { name: s.name }] } })) continue;
    await prisma.source.create({ data: { id: s.id, name: s.name, color: s.color, isPaid: !!s.isPaid, isFallback: !!s.isFallback, integrationKeys: s.integrationKeys, sortOrder: i + 1 } });
  }
  console.log(`Sources: ${SOURCES.length}`);
}

async function seedProducts() {
  for (const [i, p] of PRODUCTS.entries()) {
    if (await prisma.product.findFirst({ where: { OR: [{ id: p.id }, { name: p.name }] } })) continue;
    await prisma.product.create({ data: { id: p.id, name: p.name, metaAnswerKeys: p.metaAnswerKeys, sortOrder: i + 1 } });
  }
  console.log(`Products: ${PRODUCTS.length}`);
}

async function seedPipelines() {
  for (const [i, p] of PIPELINES.entries()) {
    if (await prisma.pipeline.findFirst({ where: { OR: [{ id: p.id }, { name: p.name }] } })) continue;
    const autoProducts = await prisma.product.findMany({ where: { name: { in: p.autoProducts } }, select: { id: true } });
    await prisma.pipeline.create({
      data: {
        id: p.id,
        name: p.name,
        description: p.description,
        isDefault: p.isDefault && !(await prisma.pipeline.findFirst({ where: { isDefault: true } })),
        sortOrder: i,
        autoProducts: { connect: autoProducts },
        stages: {
          create: p.stages.map((s, k) => ({
            ...(s.id ? { id: s.id } : {}),
            label: s.label,
            category: s.category,
            sortOrder: k + 1,
            color: s.color,
            isInitial: !!s.isInitial,
            requiresQualification: !!s.requiresQualification,
            askReviveDate: !!s.askReviveDate,
            staleDays: s.staleDays ?? null,
            staleTaskType: s.staleTaskType ?? (s.staleDays ? "FOLLOW_UP" : null),
            probability: s.probability ?? null,
            systemKey: s.systemKey,
          })),
        },
      },
    });
  }
  console.log(`Pipelines: ${PIPELINES.length}`);
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
