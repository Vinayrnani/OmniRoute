import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { FreeBudgetView } from "../../src/app/(dashboard)/dashboard/usage/components/FreeBudgetCard.tsx";

const data = {
  steadyRecurringTokens: 1_940_000_000,
  steadyWithRecurringCreditsTokens: 1_941_000_000,
  firstMonthRealisticTokens: 2_530_000_000,
  usedThisMonth: 40_000_000,
  remaining: 1_900_000_000,
  modelCount: 530,
  poolCount: 50,
  perModel: [
    { provider: "mistral", modelId: "mistral-large", displayName: "Mistral Large", monthlyTokens: 1_000_000_000, creditTokens: 0, freeType: "recurring-monthly", poolKey: "mistral", tos: "caution" },
    { provider: "kiro", modelId: "kiro", displayName: "Kiro", monthlyTokens: 25_000, creditTokens: 0, freeType: "recurring-monthly", poolKey: "kiro", tos: "avoid" },
  ],
};

test("FreeBudgetView renders steady total, remaining, first-month, per-model rows, and ToS-restricted count", () => {
  const html = renderToStaticMarkup(React.createElement(FreeBudgetView, { data }));
  assert.match(html, /1\.94B/);          // steady
  assert.match(html, /2\.53B/);          // first-month
  assert.match(html, /remaining/i);
  assert.match(html, /Mistral Large/);
  assert.match(html, /1 .*(ToS|restricted)/i); // 1 avoid-flagged model called out
});
