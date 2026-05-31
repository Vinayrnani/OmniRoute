-- 086: Plugin execution metrics
-- Tracks per-plugin hook call counts, errors, and cumulative latency.
-- Upserted by src/lib/db/pluginMetrics.ts on (plugin_name, event).

CREATE TABLE IF NOT EXISTS plugin_metrics (
  plugin_name TEXT NOT NULL,
  event TEXT NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  total_duration_ms REAL NOT NULL DEFAULT 0,
  last_called_at TEXT,
  PRIMARY KEY (plugin_name, event)
);

CREATE INDEX IF NOT EXISTS idx_plugin_metrics_name ON plugin_metrics(plugin_name);
