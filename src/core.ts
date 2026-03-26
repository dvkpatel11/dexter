/**
 * @dexter/core — Backend barrel export.
 *
 * This is the public API surface for any non-CLI consumer:
 * microservices, pipelines, serverless functions, tests, etc.
 *
 * Zero UX dependencies — no pi-tui, no chalk, no terminal rendering.
 */

// ── Agent ────────────────────────────────────────────────────────────────────
export { Agent } from './agent/agent.js';
export type {
  AgentConfig,
  AgentEvent,
  ApprovalDecision,
  ChannelProfile,
  ContextClearedEvent,
  DisplayEvent,
  DoneEvent,
  MemoryFlushEvent,
  MemoryRecalledEvent,
  Message,
  ThinkingEvent,
  TokenUsage,
  ToolApprovalEvent,
  ToolDeniedEvent,
  ToolEndEvent,
  ToolErrorEvent,
  ToolLimitEvent,
  ToolProgressEvent,
  ToolStartEvent,
} from './agent/types.js';

// ── Headless Runner ──────────────────────────────────────────────────────────
export { runAgent } from './runner.js';
export type { RunOptions, RunResult } from './runner.js';

// ── Tools ────────────────────────────────────────────────────────────────────
export { getTools, getToolRegistry } from './tools/registry.js';

// ── Finance API Clients ──────────────────────────────────────────────────────
export { api as polygon, finnhub, fmp, edgar, edgarSearch } from './tools/finance/api.js';

// ── LLM ──────────────────────────────────────────────────────────────────────
export { callLlm, getChatModel } from './model/llm.js';
export { PROVIDERS, resolveProvider, getProviderById } from './providers.js';

// ── Memory ───────────────────────────────────────────────────────────────────
export { MemoryManager } from './memory/index.js';

// ── Config & Utils ───────────────────────────────────────────────────────────
export {
  loadConfig,
  getSetting,
  setSetting,
  getSearchConfig,
  getEvalConfig,
} from './utils/config.js';
export type { SearchConfig, EvalConfig } from './utils/config.js';
export { logger } from './utils/logger.js';
