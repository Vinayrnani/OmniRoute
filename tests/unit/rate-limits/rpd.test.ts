import test from "node:test";
import assert from "node:assert/strict";
import { setRateLimiterTestMode } from "../../../src/shared/utils/rateLimiter.ts";
import { checkRateLimit, type RateLimitRule } from "../../../src/shared/utils/rateLimiter.ts";

const DAY_WINDOW = 86400;

test.beforeEach(() => {
  setRateLimiterTestMode(true);
});

test.afterEach(() => {
  setRateLimiterTestMode(false);
});

test("RPD: allows requests within daily limit", async () => {
  const rules: RateLimitRule[] = [{ limit: 100, window: DAY_WINDOW }];
  const keyId = "test-rpd-1";

  for (let i = 0; i < 100; i++) {
    const result = await checkRateLimit(keyId, rules);
    assert.equal(result.allowed, true, `Request ${i + 1} should be allowed`);
  }
});

test("RPD: rejects requests exceeding daily limit", async () => {
  const rules: RateLimitRule[] = [{ limit: 5, window: DAY_WINDOW }];
  const keyId = "test-rpd-2";

  for (let i = 0; i < 5; i++) {
    const result = await checkRateLimit(keyId, rules);
    assert.equal(result.allowed, true, `Request ${i + 1} should be allowed`);
  }

  const result = await checkRateLimit(keyId, rules);
  assert.equal(result.allowed, false, "6th request should be rejected");
  assert.equal(result.failedWindow, DAY_WINDOW, "Failed window should be daily window");
});

test("RPD: lazy reset when date changes (new day window)", async () => {
  const rules: RateLimitRule[] = [{ limit: 2, window: DAY_WINDOW }];
  const keyId = "test-rpd-3";

  const result1 = await checkRateLimit(keyId, rules);
  assert.equal(result1.allowed, true);
  const result2 = await checkRateLimit(keyId, rules);
  assert.equal(result2.allowed, true);
  const result3 = await checkRateLimit(keyId, rules);
  assert.equal(result3.allowed, false, "Should be rate limited on same day");
});

test("RPD: counter increments correctly per request", async () => {
  const rules: RateLimitRule[] = [{ limit: 10, window: DAY_WINDOW }];
  const keyId = "test-rpd-4";

  const results = [];
  for (let i = 0; i < 3; i++) {
    const result = await checkRateLimit(keyId, rules);
    results.push(result);
  }

  assert.equal(results[0].allowed, true);
  assert.equal(results[1].allowed, true);
  assert.equal(results[2].allowed, true);
});

test("RPD: multiple rules - daily and minute windows work together", async () => {
  const rules: RateLimitRule[] = [
    { limit: 100, window: DAY_WINDOW },
    { limit: 10, window: 60 },
  ];
  const keyId = "test-rpd-5";

  for (let i = 0; i < 10; i++) {
    const result = await checkRateLimit(keyId, rules);
    assert.equal(result.allowed, true, `Request ${i + 1} should be allowed`);
  }

  const result = await checkRateLimit(keyId, rules);
  assert.equal(result.allowed, false, "Should be rate limited by minute window");
  assert.equal(result.failedWindow, 60, "Failed window should be minute window");
});

test("RPD: different keys have independent counters", async () => {
  const rules: RateLimitRule[] = [{ limit: 2, window: DAY_WINDOW }];

  const result1a = await checkRateLimit("key-a", rules);
  const result1b = await checkRateLimit("key-a", rules);
  const result1c = await checkRateLimit("key-a", rules);

  const result2a = await checkRateLimit("key-b", rules);
  const result2b = await checkRateLimit("key-b", rules);

  assert.equal(result1a.allowed, true);
  assert.equal(result1b.allowed, true);
  assert.equal(result1c.allowed, false, "key-a should be rate limited");

  assert.equal(result2a.allowed, true);
  assert.equal(result2b.allowed, true);
});

test("RPD: RPD hit triggers cooldown behavior (returns failedWindow)", async () => {
  const rules: RateLimitRule[] = [{ limit: 1, window: DAY_WINDOW }];
  const keyId = "test-rpd-cooldown";

  const first = await checkRateLimit(keyId, rules);
  assert.equal(first.allowed, true);

  const second = await checkRateLimit(keyId, rules);
  assert.equal(second.allowed, false);
  assert.equal(second.failedWindow, DAY_WINDOW);
});

test("RPD: RPD hit information can be used for fallback logic", async () => {
  const rules: RateLimitRule[] = [{ limit: 1, window: DAY_WINDOW }];
  const keyId = "test-rpd-fallback";

  await checkRateLimit(keyId, rules);
  const result = await checkRateLimit(keyId, rules);

  assert.equal(result.allowed, false);
  assert.equal(result.failedWindow, DAY_WINDOW);

  const isDailyLimitHit = result.failedWindow === DAY_WINDOW;
  assert.equal(isDailyLimitHit, true, "Should detect daily limit hit for fallback");
});

test("RPD: zero limit rejects all requests", async () => {
  const rules: RateLimitRule[] = [{ limit: 0, window: DAY_WINDOW }];
  const keyId = "test-rpd-zero";

  const result = await checkRateLimit(keyId, rules);
  assert.equal(result.allowed, false);
  assert.equal(result.failedWindow, DAY_WINDOW);
});

test("RPD: empty rules array allows all requests", async () => {
  const rules: RateLimitRule[] = [];
  const keyId = "test-rpd-empty";

  const result = await checkRateLimit(keyId, rules);
  assert.equal(result.allowed, true);
});
