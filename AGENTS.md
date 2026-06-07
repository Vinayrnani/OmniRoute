# omniroute — Agent Guidelines

## Project

Unified AI proxy/router — route any LLM through one endpoint. Multi-provider support with **212+ providers** and **MCP Server (37 tools)**.

## Core Stack
- **Runtime**: Next.js 16 (App Router), Node.js (20/22/24), ESM.
- **Language**: TypeScript 5.9 (strict: false, but explicit types preferred).
- **Database**: SQLite (better-sqlite3).
- **Architecture**: Monorepo (`src/` for Next.js, `open-sse/` for streaming, `electron/` for desktop).

## Operational Gatekeepers (Must Read)
- **Coverage Gate**: `npm run test:coverage` requires ≥60% for statements, lines, functions, branches. 
- **Bug Fix Protocol**: Every bug fix **MUST** be validated via TDD (failing-then-passing test) or VPS live test. Fixes without tests/records are not merged.
- **Pipeline Security**: `exec()`/`spawn()` uses `env` option (never string interpolation). Error messages use `sanitizeErrorMessage()` (never raw `err.stack`). Upstream credentials use `resolvePublicCred()`.

## Build & Test
| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server (http://localhost:20128) |
| `npm run build` | Next.js build (`.build/next/`) |
| `npm run test:all` | Runs everything (unit, vitest, e2e, protocols) |
| `npm run test:unit` | Node.js native runner (most tests) |
| `npm run test:vitest` | MCP server, autoCombo, cache |

## Development Rules
1. **DB Ops**: Go through `src/lib/db/` domain modules (45+ files) — **never** raw SQL.
2. **Path Aliases**: `@/` → `src/`, `@omniroute/open-sse` → `open-sse/`.
3. **No Barrel Imports**: Importing from `localDb.ts` is restricted to re-exporting.
4. **Resilience**: 3 layers (Provider Circuit Breaker, Connection Cooldown, Model Lockout).
5. **Auto-Combo**: Routing engine scores candidates on 9 factors; read `docs/routing/AUTO-COMBO.md` before touching.
6. **Compression Pipeline**: Proactive compression (RTK/Caveman) runs before existing reactive context manager.

## Reference Documentation (docs/)
- **Architecture**: `docs/architecture/ARCHITECTURE.md`
- **Routing**: `docs/routing/AUTO-COMBO.md`, `docs/routing/REASONING_REPLAY.md`
- **Security**: `docs/security/GUARDRAILS.md`, `docs/security/ERROR_SANITIZATION.md`, `docs/security/PUBLIC_CREDS.md`
- **Protocols**: `docs/frameworks/MCP-SERVER.md`, `docs/frameworks/A2A-SERVER.md`, `docs/frameworks/CLOUD_AGENT.md`

## Review Focus
- Database operations must be domain-isolated.
- SSE streams must handle cleanup/abort signals to prevent leaks.
- All API routes follow: `CORS → Zod Validation → Optional Auth → Policy Enforcement → open-sse Delegation`.
- No raw `err.stack` exposure in public-facing API responses.
