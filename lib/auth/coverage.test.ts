// Static guard check (06 §2.3): every exported server action and route handler must start from one of the
// guards. Hiding buttons isn't security; this test fails when a new action forgets its check.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const GUARDS = /requirePermission\(|requireUser\(|getCurrentUser\(|getOptionalUser\(|editableLead\(|editableMember\(|ownTask\(|load\(|guard\(|CRON_SECRET|x-api-key|verifyMetaSignature|hub\.verify_token/;
// Public by design: the website form (honeypot), health check, NextAuth itself
const PUBLIC = new Set(["app/enquire/actions.ts:submitEnquiry", "app/api/health/route.ts:GET"]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function exportedFunctions(src: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const re = /export async function (\w+)[^{]*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    // Body = up to the next top-level "export" or end of file (good enough for these files)
    const next = src.indexOf("\nexport ", m.index + 1);
    out.push({ name: m[1], body: src.slice(m.index, next < 0 ? undefined : next) });
  }
  return out;
}

describe("every server action / route handler is guarded", () => {
  const files = walk(join(ROOT, "app")).filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("[...nextauth]"));
  const targets = files.filter((f) => {
    const src = readFileSync(f, "utf8");
    return f.endsWith("route.ts") || /^["']use server["']/m.test(src);
  });

  it("finds the action files", () => expect(targets.length).toBeGreaterThan(15));

  for (const f of targets) {
    const rel = relative(ROOT, f).replace(/\\/g, "/");
    for (const fn of exportedFunctions(readFileSync(f, "utf8"))) {
      const key = `${rel}:${fn.name}`;
      if (PUBLIC.has(key)) continue;
      it(key, () => expect(GUARDS.test(fn.body), `${key} has no permission/auth guard`).toBe(true));
    }
  }
});
