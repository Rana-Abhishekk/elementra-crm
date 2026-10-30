"use server";

import { ingestLead } from "@/lib/domain/leads/ingest";
import { splitName, possessionFrom } from "@/lib/domain/integrations/metaLead";

export type EnquiryState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "done"; firstName: string; branch: string | null; routed: boolean; outOfArea: boolean };

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

export async function submitEnquiry(_prev: EnquiryState, form: FormData): Promise<EnquiryState> {
  // Honeypot: bots fill every field
  if (str(form, "website")) return { status: "done", firstName: "", branch: null, routed: false, outOfArea: false };
  const name = str(form, "name");
  if (!name) return { status: "error", error: "Please tell us your name." };
  if (!str(form, "phone")) return { status: "error", error: "Please add a phone number so we can call you." };
  const products = form.getAll("products").filter((p): p is string => typeof p === "string" && p.length > 0 && p.length < 64);
  const timeline = str(form, "possession");
  const res = await ingestLead({
    ...splitName(name),
    phone: str(form, "phone"),
    email: str(form, "email"),
    pincode: str(form, "pincode"),
    siteAddress: str(form, "area"),
    products,
    possessionDate: possessionFrom(timeline ?? undefined, new Date()),
    notes: str(form, "message") ? `Website message: ${str(form, "message")}` : null,
    source: "web:form",
    channel: "WEBSITE_FORM",
  });
  if (!res.ok) return { status: "error", error: res.error };
  const routed = res.lead.locationStatus === "RESOLVED" && res.decision.branchName !== "Online Desk";
  return { status: "done", firstName: res.lead.firstName, branch: res.decision.branchName, routed, outOfArea: res.lead.locationStatus === "OUT_OF_AREA" };
}
