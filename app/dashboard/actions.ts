"use server";

import { revalidatePath } from "next/cache";
import { DealStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

export async function createCompany(form: FormData) {
  await requireUser();
  const name = text(form, "name");
  if (!name) return;
  await prisma.company.create({
    data: { name, domain: text(form, "domain"), industry: text(form, "industry"), phone: text(form, "phone") },
  });
  revalidatePath("/dashboard/companies");
}

export async function createContact(form: FormData) {
  const user = await requireUser();
  const firstName = text(form, "firstName");
  if (!firstName) return;
  await prisma.contact.create({
    data: {
      firstName,
      lastName: text(form, "lastName"),
      email: text(form, "email")?.toLowerCase(),
      phone: text(form, "phone"),
      title: text(form, "title"),
      companyId: text(form, "companyId"),
      ownerId: user.id,
    },
  });
  revalidatePath("/dashboard/contacts");
}

export async function createDeal(form: FormData) {
  const user = await requireUser();
  const title = text(form, "title");
  if (!title) return;
  const rupees = Number(text(form, "amount") ?? 0);
  const stage = text(form, "stage") as DealStage | null;
  await prisma.deal.create({
    data: {
      title,
      amount: Number.isFinite(rupees) ? Math.round(rupees * 100) : 0,
      stage: stage && stage in DealStage ? stage : DealStage.LEAD,
      companyId: text(form, "companyId"),
      contactId: text(form, "contactId"),
      ownerId: user.id,
    },
  });
  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard");
}

export async function updateDealStage(dealId: string, form: FormData) {
  await requireUser();
  const stage = text(form, "stage") as DealStage | null;
  if (!stage || !(stage in DealStage)) return;
  await prisma.deal.update({ where: { id: dealId }, data: { stage } });
  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard");
}
