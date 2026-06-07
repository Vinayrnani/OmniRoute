-- Migration 098: RPD (Requests Per Day) Counters
-- Atomic daily request counters for rate limiting across providers/connections

CREATE TABLE IF NOT EXISTS rpd_counters (
    id TEXT NOT NULL,                    -- provider:connectionId or provider:connectionId:model
    date TEXT NOT NULL,                  -- YYYY-MM-DD format (local date)
    count INTEGER DEFAULT 0,
    PRIMARY KEY (id, date)
);

CREATE INDEX IF NOT EXISTS idx_rpd_counters_date ON rpd_counters(date);
