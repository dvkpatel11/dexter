# Dexter — Technical Specification

> AI agent for deep financial research.
> Bun + TypeScript + LangChain + multi-provider LLM + multi-provider finance data.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                       │
│  cli.ts · components/ · theme.ts · evals/components/            │
│  (pi-tui terminal UI, chalk colors, input handling)             │
└────────────────────────────┬────────────────────────────────────┘
                             │ events (AgentEvent stream)
┌────────────────────────────┴────────────────────────────────────┐
│                      CONTROLLER / BRIDGE                        │
│  controllers/agent-runner.ts · model-selection.ts               │
│  controllers/input-history.ts                                   │
│  (state machines, approval flow, session management)            │
└────────────────────────────┬────────────────────────────────────┘
                             │ Agent.create() / Agent.run()
┌────────────────────────────┴────────────────────────────────────┐
│                         CORE ENGINE                             │
│  agent/agent.ts · agent/tool-executor.ts · agent/prompts.ts     │
│  agent/run-context.ts · agent/scratchpad.ts                     │
│  model/llm.ts · providers.ts                                    │
│  (iterative LLM loop, tool dispatch, context management)        │
└────────────────┬──────────────────────────┬─────────────────────┘
                 │                          │
    ┌────────────┴──────────┐   ┌───────────┴──────────────┐
    │      TOOL LAYER       │   │     MEMORY LAYER         │
    │  tools/finance/       │   │  memory/ (SQLite, FTS5,  │
    │  tools/search/        │   │  embeddings, chunker,    │
    │  tools/fetch/         │   │  hybrid search)          │
    │  tools/browser/       │   └──────────────────────────┘
    │  tools/filesystem/    │
    │  tools/memory/        │
    │  tools/skill.ts       │
    │  tools/registry.ts    │
    └───────────┬───────────┘
                │
    ┌───────────┴───────────────────────────────────────────┐
    │                  DATA PROVIDERS                        │
    │  Polygon.io · Finnhub · FMP · SEC EDGAR               │
    │  Exa · Perplexity · Tavily · X/Twitter                │
    │  Playwright (browser) · Local filesystem               │
    └───────────────────────────────────────────────────────┘
```

---

## 2. Module Audit

### 2.1 Presentation Layer (UX-only)

| Module | Files | Purpose | External Deps |
|--------|-------|---------|---------------|
| `src/cli.ts` | 1 | Terminal UI orchestrator — renders chat log, editor, model selector, approval prompts. Consumes `AgentEvent` stream. | pi-tui |
| `src/components/` | 12 | UI primitives — answer-box, approval-prompt, chat-log, custom-editor, debug-panel, intro, select-list, tool-event, user-query, working-indicator | pi-tui, chalk |
| `src/theme.ts` | 1 | Color tokens for terminal rendering | chalk |
| `src/evals/components/` | 5 | Eval dashboard TUI (progress, stats, results) | pi-tui, chalk |

**Verdict**: Clean UX layer. Zero backend logic. Only imports from controllers + agent types.

### 2.2 Controller / Bridge Layer (mixed — needs attention)

| Module | Purpose | Backend? | UX? |
|--------|---------|----------|-----|
| `controllers/agent-runner.ts` | Wraps `Agent.create()`/`Agent.run()`, manages abort signals, approval callbacks, session-approved tools | Yes (agent lifecycle) | Yes (event relay, callbacks shaped for TUI) |
| `controllers/model-selection.ts` | Provider/model picker state machine, quickSwitch | Partial (settings writes) | Yes (state machine drives select-list component) |
| `controllers/input-history.ts` | Up/down arrow history navigation | No | Yes (purely input UX) |

**Verdict**: `agent-runner.ts` is the primary coupling point. It bridges the `Agent` async generator into the CLI's callback model. This is the seam to split on.

### 2.3 Core Engine (backend — clean)

| Module | Files | Purpose |
|--------|-------|---------|
| `agent/agent.ts` | 1 | Iterative LLM + tool loop. `Agent.create()` → `Agent.run()` async generator yielding `AgentEvent[]`. Context clearing at 100k tokens. |
| `agent/tool-executor.ts` | 1 | Dispatches tool calls from LLM response, enforces limits, yields tool start/end/error events |
| `agent/prompts.ts` | 1 | Builds system prompt from SOUL.md, SEARCH.md, skill descriptions, tool descriptions, channel profile |
| `agent/run-context.ts` | 1 | Mutable state bag per agent run (token counter, scratchpad, messages) |
| `agent/scratchpad.ts` | 1 | Append-only JSONL tool usage log for audit trail |
| `agent/channels.ts` | 1 | Channel profiles (CLI vs WhatsApp response formatting rules) |
| `agent/types.ts` | 1 | `AgentEvent` union type (thinking, tool_start, tool_end, tool_error, context_cleared, memory_*, done) |
| `model/llm.ts` | 1 | `callLlm()` — provider factory, tool binding, streaming, retry on rate-limit |
| `providers.ts` | 1 | Provider registry (OpenAI, Anthropic, Google, xAI, Moonshot, DeepSeek, OpenRouter, Ollama) |

**Verdict**: Already cleanly separated. `Agent` exposes a pure async generator — no UI dependencies. The only interface to consumers is `AgentEvent`.

### 2.4 Tool Layer (backend — clean)

| Module | Purpose | Provider |
|--------|---------|----------|
| `tools/finance/api.ts` | Multi-provider HTTP client with caching | Polygon, Finnhub, FMP, SEC EDGAR |
| `tools/finance/stock-price.ts` | OHLCV, prev close, ticker search | Polygon |
| `tools/finance/crypto.ts` | Crypto prices (BTC, ETH, etc.) | Polygon |
| `tools/finance/fundamentals.ts` | Income stmt, balance sheet, cash flow | Polygon |
| `tools/finance/key-ratios.ts` | Financial ratios & metrics | FMP |
| `tools/finance/earnings.ts` | Earnings data & estimates | FMP |
| `tools/finance/estimates.ts` | Analyst estimates & targets | FMP |
| `tools/finance/news.ts` | Company news with sentiment | Polygon |
| `tools/finance/filings.ts` | SEC filings (10-K, 10-Q, 8-K) | SEC EDGAR |
| `tools/finance/insider_trades.ts` | Insider transactions | Finnhub |
| `tools/finance/segments.ts` | Revenue segmentation | FMP / SEC EDGAR |
| `tools/finance/screen-stocks.ts` | Stock screener | FMP |
| `tools/finance/get-financials.ts` | Meta-tool: LLM routes natural language → sub-tools | Composite |
| `tools/finance/get-market-data.ts` | Meta-tool: market data routing | Composite |
| `tools/finance/read-filings.ts` | Meta-tool: filing queries | Composite |
| `tools/search/exa.ts` | Web search via Exa | Exa |
| `tools/search/perplexity.ts` | Web search via Perplexity | Perplexity |
| `tools/search/tavily.ts` | Web search via Tavily | Tavily |
| `tools/search/x-search.ts` | X/Twitter search | X API |
| `tools/fetch/web-fetch.ts` | URL → markdown content | Web |
| `tools/browser/browser.ts` | Playwright automation | Playwright |
| `tools/filesystem/` | Sandboxed read/write/edit | Local FS |
| `tools/memory/` | Memory search/get/update | SQLite |
| `tools/registry.ts` | Tool discovery & conditional registration | — |

**Verdict**: Clean backend. Tools are `DynamicStructuredTool` instances (LangChain). No UI imports.

### 2.5 Memory Layer (backend — clean)

| Module | Purpose |
|--------|---------|
| `memory/store.ts` | File I/O for .md memory files |
| `memory/database.ts` | SQLite FTS5 index for chunks |
| `memory/indexer.ts` | Watches memory dir, chunks + indexes |
| `memory/embeddings.ts` | Embedding client factory |
| `memory/search.ts` | Hybrid search (70% vector + 30% keyword) |
| `memory/chunker.ts` | Text → overlapping chunks |
| `memory/flush.ts` | Memory compaction/summarization |

**Verdict**: Fully backend. No UI deps.

### 2.6 Gateway Layer (backend — independent entry point)

| Module | Purpose |
|--------|---------|
| `gateway/gateway.ts` | WhatsApp message → agent → reply loop |
| `gateway/agent-runner.ts` | Headless agent execution (no TUI) |
| `gateway/config.ts` | gateway.json Zod schema |
| `gateway/channels/whatsapp/` | Baileys integration |
| `gateway/access-control.ts` | DM/group policies |
| `gateway/sessions/` | Session persistence |
| `gateway/group/` | Group chat context |

**Verdict**: This is already a second "frontend" that consumes the same `Agent` core — proof the backend is mostly decoupled.

### 2.7 Utils Layer (mixed — needs triage)

| File | Classification | Notes |
|------|---------------|-------|
| `utils/config.ts` | Backend | Settings I/O |
| `utils/cache.ts` | Backend | API response caching |
| `utils/paths.ts` | Backend | .dexter dir resolution |
| `utils/env.ts` | Backend | API key management |
| `utils/tokens.ts` | Backend | Token counting |
| `utils/errors.ts` | Backend | Error classification |
| `utils/logger.ts` | Backend | Structured logging |
| `utils/ai-message.ts` | Backend | LangChain AIMessage helpers |
| `utils/model.ts` | Backend | Model metadata |
| `utils/history-context.ts` | Backend | Conversation history for prompts |
| `utils/in-memory-chat-history.ts` | Backend | Session message tracking |
| `utils/long-term-chat-history.ts` | Backend | Persistent history |
| `utils/markdown-table.ts` | **Mixed** | Uses `chalk` for terminal formatting |
| `utils/input-key-handlers.ts` | **UX** | Terminal key bindings |
| `utils/text-navigation.ts` | **UX** | Cursor word-jump logic |
| `utils/tool-description.ts` | Backend | Tool schema → text |
| `utils/thinking-verbs.ts` | Backend | Text parsing |
| `utils/progress-channel.ts` | Backend | Tool progress streaming |
| `utils/ollama.ts` | Backend | Ollama model discovery |

**Verdict**: 2 files are UX-only (`input-key-handlers`, `text-navigation`). 1 file is mixed (`markdown-table` uses chalk). The rest are clean backend.

---

## 3. Dependency Analysis: Backend vs. UX

### What's clean (no changes needed)
```
agent/          → Zero UX imports ✓
tools/          → Zero UX imports ✓
memory/         → Zero UX imports ✓
model/          → Zero UX imports ✓
providers.ts    → Zero UX imports ✓
gateway/        → Zero UX imports ✓ (already a headless consumer)
```

### What needs splitting

#### 3.1 `controllers/agent-runner.ts` — THE primary coupling point

This file is the bridge between the `Agent` async generator and the CLI's callback model. It:
- Creates `Agent` instances
- Consumes the `AgentEvent` generator
- Manages approval callbacks (interactive TUI prompts)
- Tracks session-approved tools
- Relays events to the UI

**For a pipeline backend**, you'd replace this with a headless runner (the gateway already has one at `gateway/agent-runner.ts`).

#### 3.2 `controllers/model-selection.ts` — UX state machine

Drives the model/provider selector. Pure UX concern. Backend equivalent: just call `setSetting('modelId', ...)`.

#### 3.3 `utils/markdown-table.ts` — chalk import

Uses `chalk` for terminal-formatted tables. If the backend returns raw markdown, the formatting should move to the presentation layer.

#### 3.4 `evals/run.ts` — Mixed TUI + eval logic

The eval runner mixes TUI rendering with evaluation logic. The eval orchestration should be extracted from the TUI display.

---

## 4. Recommended Re-org for Backend/UX Separation

### Target Structure

```
dexter/
├── packages/
│   ├── core/                    # Backend — publishable, no UX deps
│   │   ├── src/
│   │   │   ├── agent/           # Agent loop, tool executor, prompts
│   │   │   ├── tools/           # All tool implementations
│   │   │   ├── memory/          # Memory system
│   │   │   ├── model/           # LLM provider routing
│   │   │   ├── utils/           # Backend utils (cache, config, tokens, errors)
│   │   │   ├── providers.ts     # Provider registry
│   │   │   └── index.ts         # Public API surface
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                     # Terminal UX — depends on @dexter/core
│   │   ├── src/
│   │   │   ├── components/      # pi-tui components
│   │   │   ├── controllers/     # CLI-specific state machines
│   │   │   ├── theme.ts
│   │   │   ├── cli.ts
│   │   │   └── index.tsx        # Entry point
│   │   └── package.json
│   │
│   ├── gateway/                 # WhatsApp bot — depends on @dexter/core
│   │   ├── src/                 # Already mostly isolated
│   │   └── package.json
│   │
│   └── evals/                   # Eval framework — depends on @dexter/core
│       ├── src/
│       └── package.json
│
├── package.json                 # Workspace root
└── tsconfig.json
```

### 4.1 `@dexter/core` Public API

This is what your pipeline would consume:

```typescript
// @dexter/core

// --- Agent ---
export { Agent } from './agent/agent.js';
export type { AgentEvent, AgentConfig, DisplayEvent } from './agent/types.js';
export type { ChannelProfile } from './agent/channels.js';

// --- Tools ---
export { getTools, getToolRegistry } from './tools/registry.js';
export { api, finnhub, fmp, edgar } from './tools/finance/api.js';

// --- LLM ---
export { callLlm, getChatModel } from './model/llm.js';
export { PROVIDERS, resolveProvider } from './providers.js';

// --- Memory ---
export { MemoryManager } from './memory/index.js';

// --- Config ---
export { loadConfig, getSetting, setSetting } from './utils/config.js';
export type { SearchConfig, EvalConfig } from './utils/config.js';

// --- Headless Runner (for pipelines) ---
export { runAgentHeadless } from './runner.js';  // NEW — see below
```

### 4.2 New: Headless Agent Runner

```typescript
// core/src/runner.ts — what your pipeline calls

import { Agent } from './agent/agent.js';
import type { AgentEvent } from './agent/types.js';

export interface RunOptions {
  query: string;
  modelId?: string;
  provider?: string;
  channel?: 'cli' | 'whatsapp' | 'api';
  signal?: AbortSignal;
  onEvent?: (event: AgentEvent) => void;
  autoApprove?: boolean;  // skip approval prompts
}

export interface RunResult {
  answer: string;
  events: AgentEvent[];
  totalTokens: number;
  toolCalls: { name: string; args: unknown; result: unknown }[];
}

export async function runAgentHeadless(options: RunOptions): Promise<RunResult> {
  const agent = await Agent.create({ ... });
  const events: AgentEvent[] = [];

  for await (const batch of agent.run(options.query, options.signal)) {
    for (const event of batch) {
      events.push(event);
      options.onEvent?.(event);

      // Auto-approve file writes if configured
      if (event.type === 'approval_requested' && options.autoApprove) {
        event.approve();
      }
    }
  }

  const done = events.find(e => e.type === 'done');
  return {
    answer: done?.answer ?? '',
    events,
    totalTokens: done?.totalTokens ?? 0,
    toolCalls: events.filter(e => e.type === 'tool_end').map(e => ({
      name: e.toolName,
      args: e.args,
      result: e.result,
    })),
  };
}
```

### 4.3 Pipeline Integration Example

```typescript
// Your separate pipeline
import { runAgentHeadless, loadConfig } from '@dexter/core';

const result = await runAgentHeadless({
  query: 'Analyze AAPL financials and compare with MSFT',
  provider: 'google',
  modelId: 'gemini-3.1-pro-preview',
  autoApprove: false,
  onEvent: (event) => {
    if (event.type === 'tool_start') console.log(`Calling ${event.toolName}...`);
    if (event.type === 'thinking') console.log(`Thinking: ${event.text}`);
  },
});

console.log(result.answer);
console.log(`Used ${result.toolCalls.length} tool calls, ${result.totalTokens} tokens`);
```

---

## 5. Migration Steps (Priority Order)

### ✅ Phase 1: DONE — Headless runner + HTTP microservice

1. **`src/core.ts`** — Backend barrel export (Agent, tools, LLM, memory, config)
2. **`src/runner.ts`** — `runAgent()` headless runner with session management
3. **`src/server.ts`** — Full HTTP microservice (Bun.serve, REST + SSE streaming)
4. **`src/agent/channels.ts`** — Added `api` channel profile
5. **Zero changes to existing CLI/gateway code**

### ✅ Phase 2: DONE — Chalk removed from backend utils

1. `utils/markdown-table.ts` — Replaced `chalk.bold()` with raw ANSI escapes
2. `chalk` now only imported by `theme.ts` (UX-only file)
3. Entire backend import chain is chalk-free and pi-tui-free

### Phase 3: Optional — Monorepo split (if needed later)

1. Set up workspace in `package.json` (`"workspaces": ["packages/*"]`)
2. Move `agent/`, `tools/`, `memory/`, `model/`, `providers.ts`, backend utils → `packages/core/`
3. Move `cli.ts`, `components/`, `controllers/`, `theme.ts`, UX utils → `packages/cli/`
4. Move `gateway/` → `packages/gateway/`
5. Move `evals/` → `packages/evals/`
6. Update import paths (or use TypeScript path aliases)

### Phase 4: Optional — Publish core as package

1. Add `packages/core/package.json` with proper exports field
2. `@dexter/core` becomes installable by any pipeline

---

## 6. Current Coupling Score

| Layer | Imports UX? | Imports Backend? | Coupling Score |
|-------|-------------|------------------|----------------|
| `agent/` | No | Self-contained | **0 — Clean** |
| `tools/` | No | `utils/cache`, `utils/logger` | **0 — Clean** |
| `memory/` | No | `utils/paths`, `utils/cache` | **0 — Clean** |
| `model/` | No | `utils/config` | **0 — Clean** |
| `gateway/` | No | `agent/`, `tools/`, `utils/` | **0 — Clean** |
| `controllers/` | Yes (shapes events for TUI) | Yes (`Agent`, settings) | **2 — Bridge (expected)** |
| `cli.ts` | Yes (pi-tui) | Yes (via controllers) | **1 — Normal entry point** |
| `components/` | Yes (pi-tui, chalk) | No | **0 — Clean** |
| `utils/` | 2 files have UX deps | — | **1 — Minor cleanup** |
| `evals/run.ts` | Yes (TUI in runner) | Yes (eval logic) | **2 — Needs split** |

**Overall: 85% already cleanly separated.** The backend is ready to be consumed by a pipeline with minimal work (Phase 1).

---

## 7. Data Flow: Finance Pipeline

```
User Query
    │
    ▼
Agent.run()  ←──  system prompt + tools bound
    │
    ▼
LLM decides tool calls
    │
    ├── get_market_data("AAPL stock price")
    │       │
    │       ▼
    │   Meta-tool: LLM routes to getStockPrice()
    │       │
    │       ▼
    │   api.get("/v2/aggs/ticker/AAPL/prev")  →  Polygon.io
    │       │
    │       ▼
    │   Cache check → HTTP fetch → strip fields → return
    │
    ├── get_financials("AAPL income statement")
    │       │
    │       ▼
    │   Meta-tool: LLM routes to getIncomeStatements()
    │       │
    │       ▼
    │   api.get("/vX/reference/financials")  →  Polygon.io
    │
    ├── web_search("AAPL tariff impact 2026")
    │       │
    │       ▼
    │   resolveSearchTool() → Exa/Perplexity/Tavily
    │
    ▼
LLM synthesizes answer from tool results
    │
    ▼
AgentEvent(type: 'done', answer: "...")
```

---

## 8. Provider Coverage Matrix

| Data Need | Provider | Free Tier | Endpoint |
|-----------|----------|-----------|----------|
| Stock OHLCV (daily) | Polygon | Yes (prev day delayed) | `/v2/aggs/ticker/{t}/prev` |
| Stock OHLCV (historical) | Polygon | Yes (2yr delayed) | `/v2/aggs/ticker/{t}/range/...` |
| Crypto prices | Polygon | Yes | `/v2/aggs/ticker/X:{pair}/prev` |
| Ticker search | Polygon | Yes | `/v3/reference/tickers` |
| Financials (IS/BS/CF) | Polygon | Yes | `/vX/reference/financials` |
| Company news | Polygon | Yes | `/v2/reference/news` |
| Key ratios (TTM) | FMP Stable | Yes | `/key-metrics-ttm` |
| Key ratios (historical) | FMP Stable | Yes | `/key-metrics` |
| Analyst estimates (annual) | FMP Stable | Yes | `/analyst-estimates` |
| Analyst estimates (quarterly) | FMP Stable | **No** (402) | `/analyst-estimates` |
| Revenue segments (product) | FMP Stable | Yes | `/revenue-product-segmentation` |
| Revenue segments (geo) | FMP Stable | Yes | `/revenue-geographic-segmentation` |
| Stock screener | FMP Stable | **No** (402) | `/company-screener` |
| Insider transactions | Finnhub | Yes (60 req/min) | `/stock/insider-transactions` |
| SEC filings search | SEC EDGAR EFTS | Yes (no key) | `/LATEST/search-index` |
| Company facts (XBRL) | SEC EDGAR | Yes (no key) | `/api/xbrl/companyfacts/CIK{n}.json` |

---

## 9. Key Metrics

| Metric | Value |
|--------|-------|
| Total TypeScript files | ~80 |
| Total lines of code | ~8,000 (est.) |
| External API providers | 8 (LLM) + 4 (finance) + 3 (search) + 1 (X) |
| Tools exposed to LLM | 16 |
| Backend files (no UX deps) | ~65 (81%) |
| UX-only files | ~15 (19%) |
| Files needing split | 3 (agent-runner controller, markdown-table, evals/run) |
