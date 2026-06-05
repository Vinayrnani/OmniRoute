import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "omniroute-freetier-route-"));

const { GET } = await import("../../src/app/api/free-tier/summary/route.ts");

test("GET /api/free-tier/summary returns the documented total and breakdown", async () => {
  const res = await GET(new Request("http://localhost/api/free-tier/summary"));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.documentedMonthlyTokens >= 1_500_000_000);
  assert.equal(body.providerCount, 22);
  assert.ok(Array.isArray(body.byProvider));
  assert.match(body.headline, /free tokens\/month/);
  assert.ok(!JSON.stringify(body).includes("at /"));
});
