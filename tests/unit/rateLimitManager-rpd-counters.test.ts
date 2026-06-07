import test from "node:test";
import assert from "node:assert/strict";
import { getDbInstance } from "../../src/lib/db/core.ts";

const rlm = await import("../../open-sse/services/rateLimitManager.ts");
const {
  incrementDailyUsage,
  getDailyUsage,
  isDailyLimitExceeded,
  __resetRateLimitManagerForTests,
} = rlm;

test.beforeEach(async () => {
  await __resetRateLimitManagerForTests();
  // Clear rpd_counters table for test isolation
  const db = getDbInstance();
  db.prepare("DELETE FROM rpd_counters").run();
});

test("incrementDailyUsage: increments counter atomically", async () => {
  const id = "test-provider:test-conn";

  const count1 = incrementDailyUsage(id);
  assert.equal(count1, 1);

  const count2 = incrementDailyUsage(id);
  assert.equal(count2, 2);

  const count3 = incrementDailyUsage(id);
  assert.equal(count3, 3);
});

test("incrementDailyUsage: different IDs have independent counters", async () => {
  const id1 = "provider-a:conn-1";
  const id2 = "provider-b:conn-2";

  incrementDailyUsage(id1);
  incrementDailyUsage(id1);
  incrementDailyUsage(id2);

  assert.equal(getDailyUsage(id1), 2);
  assert.equal(getDailyUsage(id2), 1);
});

test("getDailyUsage: returns current count for today", async () => {
  const id = "test-provider:test-conn";

  assert.equal(getDailyUsage(id), 0);

  incrementDailyUsage(id);
  incrementDailyUsage(id);

  assert.equal(getDailyUsage(id), 2);
});

test("isDailyLimitExceeded: returns false when under limit", async () => {
  const id = "test-provider:test-conn";

  incrementDailyUsage(id);
  incrementDailyUsage(id);

  assert.equal(isDailyLimitExceeded(id, 5), false);
  assert.equal(isDailyLimitExceeded(id, 3), false); // count=2, limit=3 -> 2 < 3 = false
});

test("isDailyLimitExceeded: returns true when limit reached", async () => {
  const id = "test-provider:test-conn";

  incrementDailyUsage(id);
  incrementDailyUsage(id);
  incrementDailyUsage(id);

  assert.equal(isDailyLimitExceeded(id, 3), true);
  assert.equal(isDailyLimitExceeded(id, 2), true);
});

test("isDailyLimitExceeded: returns false for zero or negative limit (no limit)", async () => {
  const id = "test-provider:test-conn";

  incrementDailyUsage(id);
  incrementDailyUsage(id);
  incrementDailyUsage(id);

  assert.equal(isDailyLimitExceeded(id, 0), false);
  assert.equal(isDailyLimitExceeded(id, -1), false);
});

test("incrementDailyUsage: model-scoped IDs work independently", async () => {
  const baseId = "provider:conn";
  const modelId1 = "provider:conn:model-a";
  const modelId2 = "provider:conn:model-b";

  incrementDailyUsage(baseId);
  incrementDailyUsage(modelId1);
  incrementDailyUsage(modelId1);
  incrementDailyUsage(modelId2);

  assert.equal(getDailyUsage(baseId), 1);
  assert.equal(getDailyUsage(modelId1), 2);
  assert.equal(getDailyUsage(modelId2), 1);
});
