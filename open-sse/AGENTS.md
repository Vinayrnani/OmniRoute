# Streaming Engine AGENTS.md

## Overview
Core streaming engine, request pipeline, handler delegation, and upstream provider execution.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Request Handlers | `open-sse/handlers/` | `chatCore.ts` is the main entry. |
| Provider Executors| `open-sse/executors/` | Provider-specific HTTP logic. |
| Translators | `open-sse/translator/` | Formats (OpenAI ↔ Anthropic ↔ Gemini). |

## CONVENTIONS
- Never swallow errors in SSE streams — use abort signals.
- Use `BaseExecutor` for all new provider integrations.

## ANTI-PATTERNS
- Raw `err.stack` in SSE responses (use `sanitizeErrorMessage()`).
- Blocking upstream fetch with excessive logic (keep executors lean).
