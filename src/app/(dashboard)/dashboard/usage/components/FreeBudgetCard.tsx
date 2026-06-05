"use client";

import { useState, useEffect } from "react";
import React from "react";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface FreeBudgetPerModel {
  provider: string;
  modelId: string;
  displayName: string;
  monthlyTokens: number;
  creditTokens: number;
  freeType: string;
  poolKey: string;
  tos: string;
}

export interface FreeBudgetData {
  steadyRecurringTokens: number;
  steadyWithRecurringCreditsTokens: number;
  firstMonthRealisticTokens: number;
  usedThisMonth: number;
  remaining: number;
  modelCount: number;
  poolCount: number;
  perModel: FreeBudgetPerModel[];
  headline?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
  return Math.round(n / 1e6) + "M";
}

// Distinct hues for stacked bar segments (cycling)
const BAR_HUES = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#84cc16", // lime
];

// ────────────────────────────────────────────────────────────────────────────
// Pure view (SSR-testable — no hooks)
// ────────────────────────────────────────────────────────────────────────────

export function FreeBudgetView({ data }: { data: FreeBudgetData }) {
  const {
    steadyRecurringTokens,
    firstMonthRealisticTokens,
    remaining,
    perModel,
  } = data;

  const pct =
    steadyRecurringTokens > 0
      ? Math.round((remaining / steadyRecurringTokens) * 100)
      : 0;

  const avoidModels = perModel.filter((m) => m.tos === "avoid");
  const modelsWithTokens = perModel.filter((m) => m.monthlyTokens > 0);
  const totalBarTokens = modelsWithTokens.reduce((s, m) => s + m.monthlyTokens, 0);

  return (
    <div className="rounded-lg border border-border bg-surface">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <span className="material-symbols-outlined text-[14px] text-text-muted">
          token
        </span>
        <span className="text-[13px] font-semibold text-text-main">
          Monthly free-token budget
        </span>
        <span className="ml-auto text-[11px] text-text-muted tabular-nums">
          {fmt(remaining)} remaining · {pct}% of {fmt(steadyRecurringTokens)}
        </span>
      </div>

      {/* Stacked bar */}
      {modelsWithTokens.length > 0 && (
        <div className="px-3 pt-2">
          <div className="flex h-3 rounded-sm overflow-hidden w-full">
            {modelsWithTokens.map((m, i) => {
              const width =
                totalBarTokens > 0
                  ? ((m.monthlyTokens / totalBarTokens) * 100).toFixed(2)
                  : "0";
              return (
                <div
                  key={m.modelId}
                  title={`${m.displayName}: ${fmt(m.monthlyTokens)}`}
                  style={{
                    flexBasis: `${width}%`,
                    background: BAR_HUES[i % BAR_HUES.length],
                    minWidth: m.monthlyTokens > 0 ? "2px" : "0",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* First-month callout */}
      <div className="px-3 py-2 text-[11px] text-text-muted tabular-nums">
        Up to{" "}
        <span className="font-semibold text-text-main">
          {fmt(firstMonthRealisticTokens)}
        </span>{" "}
        in your first month with signup credits
      </div>

      {/* ToS-restricted callout */}
      {avoidModels.length > 0 && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
          <span className="material-symbols-outlined text-[14px] text-text-muted">
            warning
          </span>
          <span className="text-[11px] text-amber-400">
            {avoidModels.length} model
            {avoidModels.length !== 1 ? "s" : ""} flagged as ToS-restricted
          </span>
        </div>
      )}

      {/* Per-model legend grid */}
      <div className="px-3 pb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-0.5 mt-1">
          {perModel.map((m, i) => (
            <div
              key={m.modelId}
              className="flex items-center gap-1.5 px-0 py-1 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded"
              title={`${m.provider} · ${m.freeType}${m.tos === "avoid" ? " · ⚠ ToS-restricted" : m.tos === "caution" ? " · ⚡ caution" : ""}`}
            >
              <span
                className="inline-block w-2 h-2 rounded-sm flex-shrink-0"
                style={{ background: BAR_HUES[i % BAR_HUES.length] }}
              />
              <span className="text-[11px] text-text-muted tabular-nums truncate">
                {m.displayName}
              </span>
              <span className="text-[11px] text-text-muted tabular-nums ml-auto">
                {m.monthlyTokens >= 1e6 ? fmt(m.monthlyTokens) : m.monthlyTokens.toLocaleString()}
              </span>
              {m.tos === "avoid" && (
                <span className="material-symbols-outlined text-[11px] text-amber-400">
                  warning
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Fetch wrapper (client component)
// ────────────────────────────────────────────────────────────────────────────

export default function FreeBudgetCard() {
  const [data, setData] = useState<FreeBudgetData | null>(null);

  useEffect(() => {
    fetch("/api/free-tier/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) setData(json as FreeBudgetData);
      })
      .catch(() => {
        /* best-effort */
      });
  }, []);

  if (!data) return null;

  return <FreeBudgetView data={data} />;
}
