import test from "node:test";
import assert from "node:assert/strict";
import { buildDefaultRateLimits } from "../../src/shared/utils/apiKeyPolicy";
import { RateLimitRule } from "../../src/shared/utils/rateLimiter";

test("buildDefaultRateLimits: builds correct windows", () => {
    const limits = buildDefaultRateLimits("100");
    // Expected: [100/day, 500/week, 2000/month]
    assert.equal(limits.length, 3);
    assert.deepEqual(limits[0], { limit: 100, window: 86400 });
    assert.deepEqual(limits[1], { limit: 500, window: 604800 });
});

test("buildDefaultRateLimits: returns empty for 0", () => {
    const limits = buildDefaultRateLimits("0");
    assert.equal(limits.length, 0);
});
