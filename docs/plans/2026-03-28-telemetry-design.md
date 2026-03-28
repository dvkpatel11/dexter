# Telemetry and Execution Logs Design

## Purpose
Augment the backend orchestrator (Dexter) to serve LangSmith telemetry correlation IDs, and introduce an end-to-end testing suite to assert the efficiency and effectiveness of the agent's financial skills.

## Architecture Choice
**Approach: LangSmith Telemetry**
Rather than building a custom stateful SQLite schema for execution logs, we will rely completely on the existing LangSmith integration. The backend remains stateless.

## Changes

### 1. Data Model (Served Data)
The `/api/query` REST API response will be augmented to include the LangSmith Trace ID (`runId`).
The resulting JSON response will look like:
```json
{
  "runId": "uuid-v4-langsmith-trace",
  "answer": "Apple's market cap is...",
  "iterations": 2,
  "totalTime": 1500,
  "tokenUsage": {
    "totalTokens": 300,
    "promptTokens": 200,
    "completionTokens": 100
  },
  "tokensPerSecond": 45,
  "toolCalls": [ ... ]
}
```

### 2. End-to-End Test Suite
A new test file (`src/evals/e2e.test.ts`) will be created using Bun's test runner.
The test will:
1. Start the HTTP Server natively or call the handler.
2. Hit the `/api/query` endpoint with a specific financial question (e.g., "AAPL market cap").
3. Assert **Efficiency**: Ensure `totalTime` is under an acceptable threshold (e.g., < 15s) and `tokenUsage.totalTokens` < 5000.
4. Assert **Effectiveness**: Ensure the `financial_search` tool was called in `toolCalls` and the `answer` string contains expected strings.
5. Emits traces naturally to LangSmith if `LANGSMITH_TRACING=true`.
