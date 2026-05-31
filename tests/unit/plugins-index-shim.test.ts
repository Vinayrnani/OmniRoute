/**
 * Unification regression test.
 *
 * Before the shim, chatCore.ts imported runOnRequest from `plugins/index` (an
 * in-process `_plugins[]` array) while the plugin manager registered handlers
 * in `plugins/hooks` — two disconnected registries, so an activated plugin's
 * hooks never fired on real requests. `index.ts` is now a re-export shim over
 * `hooks.ts`, so a handler registered through the shim is the same one chatCore
 * runs. This test guards that wiring.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  registerPlugin,
  runOnRequest,
  runOnResponse,
  runOnError,
  resetPlugins,
} from "../../src/lib/plugins/index.ts";

const ctx = {
  requestId: "r1",
  body: { messages: [] },
  model: "m",
  provider: "p",
  metadata: {},
};

test("index shim: a handler registered via the shim fires through runOnRequest", async () => {
  resetPlugins();
  let fired = false;
  registerPlugin("onRequest", "test-plugin", () => {
    fired = true;
    return { metadata: { seen: true } };
  });

  const result = await runOnRequest(ctx);

  assert.equal(fired, true, "handler registered through index shim must fire");
  assert.deepEqual(result.metadata, { seen: true });
  resetPlugins();
});

test("index shim: a blocking handler blocks the request", async () => {
  resetPlugins();
  registerPlugin("onRequest", "blocker", () => ({ blocked: true, response: { error: "no" } }));

  const result = await runOnRequest(ctx);

  assert.equal(result.blocked, true);
  assert.deepEqual(result.response, { error: "no" });
  resetPlugins();
});

test("index shim: runOnResponse chains the response through handlers", async () => {
  resetPlugins();
  registerPlugin("onResponse", "wrapper", (payload) => ({
    response: { wrapped: (payload as { response: unknown }).response },
  }));

  const out = await runOnResponse(ctx, { original: true });

  assert.deepEqual(out, { wrapped: { original: true } });
  resetPlugins();
});

test("index shim: runOnError fires without throwing", async () => {
  resetPlugins();
  let seen = false;
  registerPlugin("onError", "err-plugin", () => {
    seen = true;
  });

  await runOnError(ctx, new Error("boom"));

  assert.equal(seen, true);
  resetPlugins();
});
