/**
 * Headless Agent Runner — no UI, no terminal, no chalk.
 *
 * Wraps the core Agent class for programmatic use by:
 * - REST/HTTP microservices (server.ts)
 * - Pipeline orchestrators
 * - Serverless functions
 * - Test harnesses
 *
 * Modeled after gateway/agent-runner.ts but without WhatsApp-specific logic.
 */

import { Agent } from './agent/agent.js';
import type { AgentConfig, AgentEvent, ApprovalDecision, DoneEvent, TokenUsage } from './agent/types.js';
import { InMemoryChatHistory } from './utils/in-memory-chat-history.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RunOptions {
  /** The user query / prompt */
  query: string;
  /** LLM model id (e.g., 'gemini-3.1-pro-preview', 'gpt-5.4') */
  model?: string;
  /** LLM provider id (e.g., 'google', 'openai', 'anthropic') */
  provider?: string;
  /** Max agent iterations before stopping (default: 10) */
  maxIterations?: number;
  /** Channel profile — affects system prompt style ('cli' | 'whatsapp' | 'api') */
  channel?: string;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Callback for real-time event streaming */
  onEvent?: (event: AgentEvent) => void | Promise<void>;
  /**
   * How to handle tool approval requests (write_file, edit_file).
   * - 'auto-approve': approve all without prompting
   * - 'auto-deny': deny all without prompting
   * - function: custom handler
   * Default: 'auto-deny' (safe for pipelines)
   */
  approvalMode?: 'auto-approve' | 'auto-deny' | ((request: { tool: string; args: Record<string, unknown> }) => Promise<ApprovalDecision>);
  /** Enable/disable persistent memory (default: true) */
  memory?: boolean;
  /** Session key for conversation continuity — same key = shared history */
  sessionKey?: string;
}

export interface RunResult {
  /** The agent's final answer text */
  answer: string;
  /** All events emitted during execution */
  events: AgentEvent[];
  /** Number of agent loop iterations */
  iterations: number;
  /** Wall-clock time in ms */
  totalTime: number;
  /** Token usage breakdown */
  tokenUsage?: TokenUsage;
  /** Output tokens per second */
  tokensPerSecond?: number;
  /** Tool calls with args and results */
  toolCalls: Array<{ tool: string; args: Record<string, unknown>; result: string }>;
}

// ── Session Management ───────────────────────────────────────────────────────

interface Session {
  history: InMemoryChatHistory;
  tail: Promise<void>;
}

const sessions = new Map<string, Session>();

function getSession(key: string, model: string): Session {
  const existing = sessions.get(key);
  if (existing) return existing;
  const session: Session = {
    history: new InMemoryChatHistory(model),
    tail: Promise.resolve(),
  };
  sessions.set(key, session);
  return session;
}

/** Clear a specific session or all sessions */
export function clearSession(key?: string): void {
  if (key) {
    sessions.delete(key);
  } else {
    sessions.clear();
  }
}

// ── Runner ───────────────────────────────────────────────────────────────────

/**
 * Run the agent headlessly and return the final result.
 *
 * Supports session continuity via `sessionKey` — the agent remembers
 * previous turns within the same session (in-memory, not persisted).
 *
 * @example
 * ```ts
 * import { runAgent } from './runner.js';
 *
 * const result = await runAgent({
 *   query: 'Analyze AAPL financials',
 *   provider: 'google',
 *   model: 'gemini-3.1-pro-preview',
 *   onEvent: (e) => console.log(e.type),
 * });
 * console.log(result.answer);
 * ```
 */
export async function runAgent(options: RunOptions): Promise<RunResult> {
  const {
    query,
    model = 'gpt-5.4',
    provider,
    maxIterations = 10,
    channel = 'api',
    signal,
    onEvent,
    approvalMode = 'auto-deny',
    memory = true,
    sessionKey,
  } = options;

  // Resolve approval handler
  const requestToolApproval = typeof approvalMode === 'function'
    ? approvalMode
    : async (_req: { tool: string; args: Record<string, unknown> }): Promise<ApprovalDecision> => {
        return approvalMode === 'auto-approve' ? 'allow-once' : 'deny';
      };

  // Session-scoped approved tools set
  const sessionApprovedTools = new Set<string>();

  const config: AgentConfig = {
    model,
    modelProvider: provider,
    maxIterations,
    signal,
    channel,
    requestToolApproval,
    sessionApprovedTools,
    memoryEnabled: memory,
  };

  // If sessionKey provided, serialize turns per session
  if (sessionKey) {
    const session = getSession(sessionKey, model);
    let result!: RunResult;
    const run = async () => {
      session.history.saveUserQuery(query);
      result = await executeAgent(config, query, onEvent, session.history);
      if (result.answer) {
        await session.history.saveAnswer(result.answer);
      }
    };
    session.tail = session.tail.then(run, run);
    await session.tail;
    return result;
  }

  // Stateless — no session continuity
  return executeAgent(config, query, onEvent);
}

async function executeAgent(
  config: AgentConfig,
  query: string,
  onEvent?: (event: AgentEvent) => void | Promise<void>,
  history?: InMemoryChatHistory,
): Promise<RunResult> {
  const agent = await Agent.create(config);
  const events: AgentEvent[] = [];
  let done: DoneEvent | undefined;

  for await (const event of agent.run(query, history)) {
    events.push(event);
    if (event.type === 'done') {
      done = event;
    }
    await onEvent?.(event);
  }

  return {
    answer: done?.answer ?? '',
    events,
    iterations: done?.iterations ?? 0,
    totalTime: done?.totalTime ?? 0,
    tokenUsage: done?.tokenUsage,
    tokensPerSecond: done?.tokensPerSecond,
    toolCalls: done?.toolCalls ?? [],
  };
}
