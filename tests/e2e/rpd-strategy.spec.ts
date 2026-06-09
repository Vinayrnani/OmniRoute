import { expect, test, type Page } from "@playwright/test";
import { gotoDashboardRoute } from "./helpers/dashboardAuth";

const NAVIGATION_TIMEOUT_MS = 300_000;

type ProviderConnection = {
  id: string;
  provider: string;
  name: string;
  authType: "api_key";
  isActive: boolean;
  testStatus: string;
  priority: number;
  rpdResetStrategy: string;
  providerSpecificData: Record<string, unknown>;
  lastError: string | null;
  lastErrorAt: string | null;
  lastErrorType: string | null;
  lastErrorSource: string | null;
  errorCode: string | null;
  rateLimitedUntil: string | null;
};

async function installProvidersMock(page: Page) {
  await page.addInitScript(() => {
    const state = {
      connections: [] as ProviderConnection[],
      nextId: 1,
      putPayloads: [] as Record<string, unknown>[],
    };

    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
    const jsonResponse = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    const readJsonBody = async (request: Request): Promise<Record<string, unknown>> => {
      try {
        const rawBody = await request.clone().text();
        if (!rawBody) return {};
        const parsed = JSON.parse(rawBody);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    };

    Object.defineProperty(window, "__rpdStrategyTestState", {
      configurable: true,
      value: state,
    });

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url, window.location.origin);
      const method = request.method.toUpperCase();
      const path = url.pathname;

      if (path === "/api/providers/expiration") {
        return jsonResponse({ summary: { expired: 0, expiringSoon: 0 }, list: [] });
      }
      if (path === "/api/provider-nodes") {
        return jsonResponse({ nodes: [], ccCompatibleProviderEnabled: false });
      }
      if (path === "/api/models/alias") {
        if (method === "GET") return jsonResponse({ aliases: {} });
        return jsonResponse({ success: true });
      }
      if (path === "/api/settings/proxy") {
        if (url.searchParams.has("resolve")) return jsonResponse({ proxy: null, level: null });
        return jsonResponse({ providers: {} });
      }
      if (path === "/api/provider-models") {
        return jsonResponse({ models: [], modelCompatOverrides: [] });
      }
      if (path === "/api/rate-limits") {
        return jsonResponse({ providers: [] });
      }
      if (path === "/api/providers/validate") {
        return jsonResponse({ valid: true });
      }
      if (path.startsWith("/api/providers/") && method === "POST" && path.endsWith("/sync-models")) {
        return jsonResponse({ syncedModels: 0, models: [] });
      }

      if (path === "/api/providers" && method === "GET") {
        return jsonResponse({ connections: clone(state.connections) });
      }

      if (path === "/api/providers" && method === "POST") {
        const payload = await readJsonBody(request);
        const connection: ProviderConnection = {
          id: `conn-${state.nextId++}`,
          provider: String(payload.provider || "openai"),
          name: String(payload.name || `Connection ${state.nextId}`),
          authType: "api_key",
          isActive: true,
          testStatus: "active",
          priority: typeof payload.priority === "number" ? payload.priority : 1,
          rpdResetStrategy: "utc_midnight",
          providerSpecificData: {},
          lastError: null,
          lastErrorAt: null,
          lastErrorType: null,
          lastErrorSource: null,
          errorCode: null,
          rateLimitedUntil: null,
        };
        state.connections.push(connection);
        return jsonResponse({ connection: clone(connection) });
      }

      const detailMatch = path.match(/^\/api\/providers\/([^/]+)$/);
      if (detailMatch && method === "PUT") {
        const connectionId = detailMatch[1];
        const payload = await readJsonBody(request);
        state.putPayloads.push(clone(payload));

        state.connections = state.connections.map((conn) =>
          conn.id === connectionId
            ? {
                ...conn,
                name: typeof payload.name === "string" ? payload.name : conn.name,
                priority: typeof payload.priority === "number" ? payload.priority : conn.priority,
                isActive:
                  typeof payload.isActive === "boolean" ? payload.isActive : conn.isActive,
                rpdResetStrategy:
                  typeof payload.rpdResetStrategy === "string"
                    ? payload.rpdResetStrategy
                    : conn.rpdResetStrategy,
                providerSpecificData: {
                  ...conn.providerSpecificData,
                  ...(payload.providerSpecificData as Record<string, unknown> | undefined),
                },
              }
            : conn
        );
        const updated = state.connections.find((conn) => conn.id === connectionId);
        return jsonResponse({ connection: clone(updated) });
      }

      const testMatch = path.match(/^\/api\/providers\/([^/]+)\/test$/);
      if (testMatch && method === "POST") {
        const connectionId = testMatch[1];
        state.connections = state.connections.map((conn) =>
          conn.id === connectionId ? { ...conn, testStatus: "active" } : conn
        );
        return jsonResponse({ valid: true });
      }

      const reauthMatch = path.match(/^\/api\/providers\/([^/]+)\/reauth$/);
      if (reauthMatch && method === "POST") {
        return jsonResponse({ success: true });
      }

      return originalFetch(input, init);
    };
  });
}

async function readMockState(page: Page) {
  return page.evaluate(() => {
    const w = window as Window & {
      __rpdStrategyTestState: {
        connections: ProviderConnection[];
        nextId: number;
        putPayloads: Record<string, unknown>[];
      };
    };
    return w.__rpdStrategyTestState;
  });
}

test.describe("RPD Reset Strategy", () => {
  test.setTimeout(600_000);

  test("supports selecting Rolling 24h strategy in edit modal and persists it", async ({ page }) => {
    await installProvidersMock(page);

    await gotoDashboardRoute(page, "/dashboard/providers/openai", {
      timeoutMs: NAVIGATION_TIMEOUT_MS,
    });

    await page.getByRole("button", { name: /^add$/i }).first().click();
    const addDialog = page.getByRole("dialog");
    await expect(addDialog).toBeVisible();
    await addDialog.getByLabel(/name/i).fill("Test RPD Connection");
    await addDialog.getByLabel(/api key/i).fill("sk-test-valid");
    await addDialog.getByRole("button", { name: /^save$/i }).click();

    await expect(page.getByText("Test RPD Connection")).toBeVisible({ timeout: 30000 });
    await expect
      .poll(async () => (await readMockState(page)).connections.length)
      .toBe(1);

    await page.getByTitle(/^edit$/i).click();
    const editDialog = page.getByRole("dialog");
    await expect(editDialog).toBeVisible();

    const advancedButton = editDialog.getByRole("button", { name: /advanced settings/i });
    await expect(advancedButton).toBeVisible();
    await advancedButton.click();

    const rpdSelect = editDialog.locator("label")
      .filter({ hasText: /RPD Reset Strategy/i })
      .locator("..")
      .locator("select");
    await expect(rpdSelect).toBeVisible();
    await expect(rpdSelect).toHaveValue("utc_midnight");

    await rpdSelect.selectOption("rolling_24h");
    await expect(rpdSelect).toHaveValue("rolling_24h");

    await editDialog.getByRole("button", { name: /^save$/i }).click();

    await expect
      .poll(async () => (await readMockState(page)).putPayloads.length)
      .toBeGreaterThanOrEqual(1);

    const payloads = (await readMockState(page)).putPayloads;
    const lastPut = payloads[payloads.length - 1];
    expect(lastPut.rpdResetStrategy).toBe("rolling_24h");

    await expect
      .poll(async () => (await readMockState(page)).connections[0]?.rpdResetStrategy)
      .toBe("rolling_24h");
  });

  test('defaults to "utc_midnight" for new connections', async ({ page }) => {
    await installProvidersMock(page);

    await gotoDashboardRoute(page, "/dashboard/providers/openai", {
      timeoutMs: NAVIGATION_TIMEOUT_MS,
    });

    await page.getByRole("button", { name: /^add$/i }).first().click();
    const addDialog = page.getByRole("dialog");
    await expect(addDialog).toBeVisible();
    await addDialog.getByLabel(/name/i).fill("Default Strategy Connection");
    await addDialog.getByLabel(/api key/i).fill("sk-test-default");
    await addDialog.getByRole("button", { name: /^save$/i }).click();

    await expect(page.getByText("Default Strategy Connection")).toBeVisible({ timeout: 30000 });
    await expect
      .poll(async () => (await readMockState(page)).connections.length)
      .toBe(1);

    await page.getByTitle(/^edit$/i).click();
    const editDialog = page.getByRole("dialog");
    await expect(editDialog).toBeVisible();

    await editDialog.getByRole("button", { name: /advanced settings/i }).click();

    const rpdSelect = editDialog.locator("label")
      .filter({ hasText: /RPD Reset Strategy/i })
      .locator("..")
      .locator("select");
    await expect(rpdSelect).toHaveValue("utc_midnight");

    await editDialog.getByRole("button", { name: /^save$/i }).click();

    await expect
      .poll(async () => (await readMockState(page)).putPayloads.length)
      .toBeGreaterThanOrEqual(1);

    const payloads = (await readMockState(page)).putPayloads;
    const lastPut = payloads[payloads.length - 1];
    expect(lastPut.rpdResetStrategy).toBe("utc_midnight");
  });
});
