import { describe, expect, it } from "vitest";
import { renderTemplate } from "./render";
import { simulatedStatus } from "./simulator";
import { buildTemplateRequest } from "./metaCloud";

describe("messaging", () => {
  it("renders {{vars}} and blanks unknown ones", () => {
    expect(renderTemplate("Hi {{name}}, {{rep_name}} from {{branch}}{{x}}.", { name: "Rhea", rep_name: "Ishita", branch: "Worli" })).toBe("Hi Rhea, Ishita from Worli.");
  });

  it("simulates ticks from elapsed time without going backwards", () => {
    const t0 = new Date("2026-10-28T10:00:00Z");
    const at = (s: number) => new Date(t0.getTime() + s * 1000);
    expect(simulatedStatus("SENT", t0, at(1))).toBe("SENT");
    expect(simulatedStatus("SENT", t0, at(5))).toBe("DELIVERED");
    expect(simulatedStatus("DELIVERED", t0, at(25))).toBe("READ");
    expect(simulatedStatus("READ", t0, at(1))).toBe("READ");
    expect(simulatedStatus("FAILED", t0, at(60))).toBe("FAILED");
  });

  it("builds the Cloud API template request shape", () => {
    const req = buildTemplateRequest({ to: "+919000000123", body: "", templateCode: "welcome_enquiry", language: "hi", variables: { name: "Rhea" } }, "123");
    expect(req.url).toMatch(/graph\.facebook\.com\/v\d+\.\d+\/123\/messages$/);
    expect(req.body).toMatchObject({ to: "919000000123", type: "template", template: { name: "welcome_enquiry", language: { code: "hi" } } });
  });
});
