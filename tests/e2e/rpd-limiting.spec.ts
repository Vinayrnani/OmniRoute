import { expect, test } from "@playwright/test";

test.describe("RPD Rate Limiting", () => {
  test("should show 429 error and fallback to next provider when RPD is exhausted", async ({ page }) => {
    // 1. Mock provider responses
    // Provider A: Exhausted (429)
    // Provider B: Success (200)
    await page.route("**/api/combos/test", async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      // Simulate RPD exhaustion for the first provider in the combo
      if (postData.providerId === "provider-a") {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            error: "RPD limit reached",
            message: "Daily quota exhausted for provider-a",
          }),
        });
      } else {
        // Success for other providers
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            resolvedBy: "provider-b",
            results: [{ model: "model-b", status: "ok", latencyMs: 50 }],
          }),
        });
      }
    });

    // 2. Navigate to dashboard
    await page.goto("/dashboard/combos", {
      waitUntil: "domcontentloaded",
    });

    // 3. Trigger the test flow
    // Assuming there's a "Test" button for a combo
    await page.getByRole("button", { name: /test now|testar agora/i }).first().click();

    // 4. Verify UI shows error and fallback
    // Expect to see the error message
    await expect(page.getByText(/daily quota exhausted/i)).toBeVisible();
    
    // Expect to see that it fell back to provider-b
    await expect(page.getByText(/resolved by: provider-b/i)).toBeVisible();
  });
});
