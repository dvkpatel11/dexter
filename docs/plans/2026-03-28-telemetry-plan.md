# Telemetry and E2E Tests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use godmode:task-runner to implement this plan task-by-task.

**Goal:** Serve LangSmith correlation IDs in the HTTP backend response and create an end-to-end test suite asserting both latency and LLM tool execution correctness.

**Architecture:** We will generate a `runId` (UUID) at the start of a query, pass it down through the agent to the LangChain `invoke` call so LangSmith uses it, and return it in the `/api/query` HTTP response. We'll add an integration test that hits the `handleRequest` directly and asserts on efficiency metrics and tool usage.

**Tech Stack:** Bun, LangChain JS, `bun test`.

---

### Task 1: Extend Types to Support `runId`

**Files:**

- Modify: `src/agent/types.ts`
- Modify: `src/agent/run-context.ts`

**Step 1: Add `runId` to AgentConfig and RunContext**

In `src/agent/types.ts`, add `runId?: string;` to `AgentConfig`.
In `src/agent/types.ts`, add `runId?: string;` to the `done` event in `AgentEvent`:

```typescript
export type AgentEvent =
  // ...
  {
    type: "done";
    answer: string;
    toolCalls: ToolCallRecord[];
    iterations: number;
    totalTime: number;
    tokenUsage?: TokenUsage;
    tokensPerSecond?: number;
    runId?: string;
  };
```

In `src/agent/run-context.ts`:
Modify `RunContext` interface to include `runId?: string;`.
Modify `createRunContext(query: string, runId?: string): RunContext`.

**Step 2: Commit**

```bash
git add src/agent/types.ts src/agent/run-context.ts
git commit -m "feat: add runId to agent types and context"
```

### Task 2: Pass `runId` through Agent to LLM

**Files:**

- Modify: `src/agent/agent.ts`
- Modify: `src/model/llm.ts`

**Step 1: Accept `runId` in Agent and callLlm**

In `src/agent/agent.ts`:
Modify `Agent` class to store `runId` from `config` (e.g. `this.runId = config.runId;`).
Pass `this.runId` to `createRunContext`.
Pass `this.runId` to `callLlm` options.
Include `runId: this.runId` in all `yield { type: 'done', ... }` events.

In `src/model/llm.ts`:
Add `runId?: string;` to `CallLlmOptions` interface.
In `callLlm`, add `runId` to `invokeOpts`:

```typescript
const invokeOpts: Record<string, any> = signal ? { signal } : {};
if (options.runId) {
  invokeOpts.runId = options.runId;
  invokeOpts.tags = ["dexter-api"];
}
```

_Note: we type it as `Record<string, any>` or pass `{ signal, runId, tags }` directly to LangChain._

**Step 2: Commit**

```bash
git add src/agent/agent.ts src/model/llm.ts
git commit -m "feat: pass runId through agent to langchain invoke"
```

### Task 3: Generate `runId` in Server and Return in API

**Files:**

- Modify: `src/runner.ts`
- Modify: `src/server.ts`

**Step 1: Generate `runId` and return it**

In `src/runner.ts`:
Add `runId?: string;` to `RunOptions` interface.
Inside `runAgent()`, generate `runId = options.runId ?? crypto.randomUUID();`.
Pass `runId` into `Agent.create({ ... config, runId })`.
Return `runId` in the final `AgentResult`:

```typescript
return {
  runId,
  answer,
  iterations,
  totalTime,
  tokenUsage,
  tokensPerSecond,
  toolCalls,
};
```

In `src/server.ts`:
In `handleQuery()`, extract `result.runId` and return it in the JSON response payload.
In `handleQueryStream()`, emit `runId` in the `result` event.

**Step 2: Commit**

```bash
git add src/runner.ts src/server.ts
git commit -m "feat: generate runId in server and return in API responses"
```

### Task 4: Create End-to-End Test Suite

**Files:**

- Create: `src/tests/evale2e.test.ts`

**Step 1: Write the E2E Test**

```typescript
import { describe, test, expect } from "bun:test";
import { server } from "../server.js";

describe("End-to-End API and Telemetry Tests", () => {
  test("POST /api/query should return financial answer, tools, latency, and runId", async () => {
    // 1. Send request
    const response = await server.fetch(
      new Request("http://localhost/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "What is the market cap of Apple?",
          model: "gpt-5.4", // Or a fast model
        }),
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();

    // 2. Assert Data Model / Telemetry
    expect(data.runId).toBeDefined();
    expect(typeof data.runId).toBe("string");

    // 3. Assert Efficiency
    expect(data.totalTime).toBeDefined();
    expect(data.totalTime).toBeLessThan(15000); // 15 seconds max

    expect(data.tokenUsage).toBeDefined();
    expect(data.tokenUsage.totalTokens).toBeGreaterThan(0);
    expect(data.tokenUsage.totalTokens).toBeLessThan(5000);

    // 4. Assert Effectiveness
    expect(data.toolCalls).toBeDefined();
    expect(data.toolCalls.length).toBeGreaterThan(0);
    const toolNames = data.toolCalls.map((tc: any) => tc.tool);
    expect(toolNames).toContain("financial_search");

    expect(data.answer).toBeDefined();
    expect(data.answer.toLowerCase()).toContain("apple");
  }, 20000); // 20s timeout
});
```

**Step 2: Run test to verify**

Run: `bun test src/tests/evale2e.test.ts`
Expected: PASS (or fail if OPENAI_API_KEY is not set, but the structure is correct).

**Step 3: Commit**

```bash
git add src/tests/evale2e.test.ts
git commit -m "test: add e2e test for api query efficiency and effectiveness"
```
