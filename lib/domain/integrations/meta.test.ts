import { describe, expect, it } from "vitest";
import { mapMetaCsvRow, stripPrefix } from "./metaCsv";
import { mapMetaLead, mapProducts, metaSource } from "./metaLead";

describe("Meta CSV import", () => {
  it("strips Meta's id and phone prefixes", () => {
    expect(stripPrefix("l:1234567890")).toBe("1234567890");
    expect(stripPrefix("ag:120000000000001")).toBe("120000000000001");
    expect(stripPrefix("as:1")).toBe("1");
    expect(stripPrefix("c:1")).toBe("1");
    expect(stripPrefix("f:9")).toBe("9");
    expect(stripPrefix("p:+919000000123")).toBe("+919000000123");
  });

  it("maps an export row", () => {
    const input = mapMetaCsvRow({
      id: "l:900100",
      created_time: "2026-10-06T10:05:14-05:00",
      ad_name: "Trust – Reel",
      adset_name: "Mumbai 30+ – Lookalike 2%",
      campaign_name: "Elementra – Leads – Oct 2026",
      form_name: "Lead form – Bespoke products V4",
      is_organic: "false",
      platform: "ig",
      elementra_bespoke_products_you_are_looking_for: "elementra_kitchens",
      full_name: "Kavya Iyer Shah",
      email: "kavya.iyer1@example.com",
      phone_number: "p:+919000000301",
      lead_status: "CREATED",
      Priority: "hot",
      site_area: "Worli",
      some_new_question: "yes",
    });
    expect(input).toMatchObject({
      firstName: "Kavya",
      lastName: "Iyer Shah",
      phone: "+919000000301",
      externalId: "900100",
      source: "INSTAGRAM_PAID",
      channel: "CSV_IMPORT",
      products: ["KITCHEN"],
      priority: "HOT",
      siteAddress: "Worli",
    });
    expect((input.receivedAt as Date).toISOString()).toBe("2026-10-06T15:05:14.000Z");
    expect((input.rawPayload as { _unmapped: Record<string, string> })._unmapped).toEqual({ site_area: "Worli", some_new_question: "yes" });
  });

  it("maps platform + organic flag to the client's sources", () => {
    expect(metaSource("fb", false)).toBe("FACEBOOK");
    expect(metaSource("ig", "true")).toBe("INSTAGRAM_ORGANIC");
    expect(metaSource("ig", false)).toBe("INSTAGRAM_PAID");
  });

  it("maps product answers and sheet-style lists", () => {
    expect(mapProducts("elementra_wardrobes")).toEqual(["WARDROBES"]);
    expect(mapProducts("Kitchen, Wardrobes, Furniture")).toEqual(["KITCHEN", "WARDROBES", "FURNITURE"]);
    expect(mapProducts("something else")).toEqual(["OTHERS"]);
  });
});

describe("Meta webhook lead", () => {
  it("maps the Graph lead object with the recommended questions", () => {
    const input = mapMetaLead({
      id: "SIM-1761630000-001",
      created_time: "2026-10-28T06:42:11+0000",
      campaign_name: "Elementra – Leads – Oct 2026",
      platform: "ig",
      is_organic: false,
      field_data: [
        { name: "full_name", values: ["Rhea Kapoor"] },
        { name: "phone_number", values: ["+919000000123"] },
        { name: "elementra_bespoke_products_you_are_looking_for", values: ["elementra_kitchens"] },
        { name: "site_pincode", values: ["400018"] },
        { name: "possession_timeline", values: ["within_3_months"] },
      ],
    });
    expect(input).toMatchObject({ firstName: "Rhea", lastName: "Kapoor", pincode: "400018", source: "INSTAGRAM_PAID", channel: "META_LEAD_AD", externalId: "SIM-1761630000-001" });
    expect((input.receivedAt as Date).toISOString()).toBe("2026-10-28T06:42:11.000Z");
    expect(input.possessionDate).toBeInstanceOf(Date);
  });

  it("works without location questions (the client's current form)", () => {
    const input = mapMetaLead({ id: "x", platform: "fb", field_data: [{ name: "full_name", values: ["Aditya Shah"] }] });
    expect(input).toMatchObject({ pincode: null, siteAddress: null, source: "FACEBOOK" });
  });
});

import { createHmac } from "node:crypto";
import { verifyMetaSignature } from "./metaWebhook";

describe("Meta webhook signature", () => {
  it("accepts a valid X-Hub-Signature-256 and rejects others", () => {
    const body = JSON.stringify({ object: "page" });
    const sig = "sha256=" + createHmac("sha256", "secret").update(body).digest("hex");
    expect(verifyMetaSignature(body, sig, "secret")).toBe(true);
    expect(verifyMetaSignature(body, sig, "other")).toBe(false);
    expect(verifyMetaSignature(body, null, "secret")).toBe(false);
  });
});

import { mapSheetRow, mapSheetSource } from "./sheets";

describe("Google Sheet row mapper", () => {
  it("maps the client's source values, typo included", () => {
    expect(mapSheetSource("Instagram Paid Media Paid Media")).toBe("INSTAGRAM_PAID");
    expect(mapSheetSource("Walkins")).toBe("WALK_IN");
    expect(mapSheetSource("Repeat purchase")).toBe("REPEAT_PURCHASE");
  });

  it("maps a Sales Pipeline row", () => {
    const r = mapSheetRow({ "First Name": "Ira", "Last Name": "Sawant", Phone: "9000060010", "Site Address": "Goregoan east", "Product/Solution": "Kitchen, Wardrobes", Source: "Whatsapp", Status: "12.Closed Lost - No response" });
    expect(r).toMatchObject({ firstName: "Ira", channel: "GOOGLE_SHEET", source: "WHATSAPP", products: ["KITCHEN", "WARDROBES"], legacyStatus: { stage: "CLOSED_LOST", lostReason: "NO_RESPONSE" } });
  });
});
