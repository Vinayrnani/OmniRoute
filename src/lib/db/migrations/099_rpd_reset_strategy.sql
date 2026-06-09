-- Migration 099: RPD Reset Strategy
-- Adds configurable RPD reset strategy per provider connection
-- Options: 'utc_midnight' (default) or 'rolling_24h'

ALTER TABLE provider_connections ADD COLUMN rpd_reset_strategy TEXT DEFAULT 'utc_midnight';
