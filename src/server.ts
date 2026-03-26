#!/usr/bin/env bun
/**
 * Dexter Microservice — HTTP API for the agent backend.
 *
 * Endpoints:
 *   POST /api/query          — run agent, return full result
 *   POST /api/query/stream   — run agent, stream events via SSE
 *   GET  /api/health         — health check
 *   GET  /api/providers      — list available LLM providers
 *   GET  /api/models/:provider — list models for a provider
 *   DELETE /api/sessions/:key — clear a session
 *
 * Uses Bun's native HTTP server (zero deps).
 *
 * Usage:
 *   bun run src/server.ts
 *   PORT=4000 bun run src/server.ts
 */

import { config } from "dotenv";

config({ quiet: true });

import type { AgentEvent } from "./agent/types.js";
import { PROVIDERS } from "./providers.js";
import type { RunOptions } from "./runner.js";
import { clearSession, runAgent } from "./runner.js";
import { logger } from "./utils/logger.js";
import { getModelsForProvider } from "./utils/model.js";

// ── Config ───────────────────────────────────────────────────────────────────

const PORT = Number(process.env.DEXTER_PORT ?? process.env.PORT ?? 3141);
const API_SECRET = process.env.DEXTER_API_SECRET; // optional bearer token

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function unauthorized(): Response {
  return json({ error: "Unauthorized — set DEXTER_API_SECRET and pass Authorization: Bearer <secret>" }, 401);
}

function checkAuth(req: Request): boolean {
  if (!API_SECRET) return true; // no secret configured = open
  const header = req.headers.get("Authorization");
  return header === `Bearer ${API_SECRET}`;
}

function cors(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// ── Request Parsing ──────────────────────────────────────────────────────────

interface QueryRequest {
  query: string;
  model?: string;
  provider?: string;
  maxIterations?: number;
  sessionKey?: string;
  approvalMode?: "auto-approve" | "auto-deny";
  memory?: boolean;
}

async function parseQueryRequest(req: Request): Promise<QueryRequest> {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.query || typeof body.query !== "string") {
    throw new Error("Missing required field: query");
  }
  return {
    query: body.query as string,
    model: body.model as string | undefined,
    provider: body.provider as string | undefined,
    maxIterations: body.maxIterations as number | undefined,
    sessionKey: body.sessionKey as string | undefined,
    approvalMode: (body.approvalMode as "auto-approve" | "auto-deny") ?? "auto-deny",
    memory: body.memory as boolean | undefined,
  };
}

// ── Route Handlers ───────────────────────────────────────────────────────────

/** POST /api/query — synchronous agent run, returns full result */
async function handleQuery(req: Request): Promise<Response> {
  const body = await parseQueryRequest(req);
  const startTime = Date.now();

  logger.info(`[server] Query: "${body.query.slice(0, 100)}${body.query.length > 100 ? "..." : ""}"`);

  const options: RunOptions = {
    query: body.query,
    model: body.model,
    provider: body.provider,
    maxIterations: body.maxIterations,
    sessionKey: body.sessionKey,
    approvalMode: body.approvalMode,
    memory: body.memory,
    channel: "api",
  };

  try {
    const result = await runAgent(options);
    logger.info(
      `[server] Done in ${Date.now() - startTime}ms — ${result.toolCalls.length} tool calls, ${result.iterations} iterations`,
    );

    return json({
      answer: result.answer,
      iterations: result.iterations,
      totalTime: result.totalTime,
      tokenUsage: result.tokenUsage,
      tokensPerSecond: result.tokensPerSecond,
      toolCalls: result.toolCalls.map((tc) => ({
        tool: tc.tool,
        args: tc.args,
        // Truncate large tool results to keep response reasonable
        result: tc.result.length > 2000 ? tc.result.slice(0, 2000) + "...(truncated)" : tc.result,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[server] Error: ${msg}`);
    return error(msg, 500);
  }
}

/** POST /api/query/stream — SSE event stream */
async function handleQueryStream(req: Request): Promise<Response> {
  const body = await parseQueryRequest(req);

  logger.info(`[server] Stream: "${body.query.slice(0, 100)}${body.query.length > 100 ? "..." : ""}"`);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const result = await runAgent({
          query: body.query,
          model: body.model,
          provider: body.provider,
          maxIterations: body.maxIterations,
          sessionKey: body.sessionKey,
          approvalMode: body.approvalMode,
          memory: body.memory,
          channel: "api",
          onEvent: (event: AgentEvent) => {
            send(event.type, event);
          },
        });

        send("result", {
          answer: result.answer,
          iterations: result.iterations,
          totalTime: result.totalTime,
          tokenUsage: result.tokenUsage,
          tokensPerSecond: result.tokensPerSecond,
          toolCalls: result.toolCalls,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send("error", { error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/** GET /api/health */
function handleHealth(): Response {
  const availableProviders = PROVIDERS.filter((p) => {
    if (p.id === "ollama" || !p.apiKeyEnvVar) return true;
    return !!process.env[p.apiKeyEnvVar]?.trim();
  });

  return json({
    status: "ok",
    version: process.env.npm_package_version ?? "dev",
    uptime: Math.floor(process.uptime()),
    providers: availableProviders.map((p) => p.id),
  });
}

/** GET /api/providers */
function handleProviders(): Response {
  return json(
    PROVIDERS.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      hasKey: p.id === "ollama" || !p.apiKeyEnvVar || !!process.env[p.apiKeyEnvVar]?.trim(),
    })),
  );
}

/** GET /api/models/:provider */
function handleModels(providerId: string): Response {
  const models = getModelsForProvider(providerId);
  if (!models || models.length === 0) {
    return error(`Unknown provider: ${providerId}`, 404);
  }
  return json(models);
}

/** DELETE /api/sessions/:key */
function handleClearSession(key: string): Response {
  clearSession(key);
  return json({ cleared: key });
}

// ── Router ───────────────────────────────────────────────────────────────────

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // CORS preflight
  if (method === "OPTIONS") return cors();

  // Auth check
  if (!checkAuth(req)) return unauthorized();

  try {
    // Health
    if (method === "GET" && path === "/api/health") {
      return handleHealth();
    }

    // Providers
    if (method === "GET" && path === "/api/providers") {
      return handleProviders();
    }

    // Models
    const modelsMatch = path.match(/^\/api\/models\/(.+)$/);
    if (method === "GET" && modelsMatch) {
      return handleModels(modelsMatch[1]);
    }

    // Query (sync)
    if (method === "POST" && path === "/api/query") {
      return await handleQuery(req);
    }

    // Query (SSE stream)
    if (method === "POST" && path === "/api/query/stream") {
      return await handleQueryStream(req);
    }

    // Clear session
    const sessionMatch = path.match(/^\/api\/sessions\/(.+)$/);
    if (method === "DELETE" && sessionMatch) {
      return handleClearSession(decodeURIComponent(sessionMatch[1]));
    }

    return error("Not found", 404);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return error(msg, 500);
  }
}

// ── Server Start ─────────────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,
  fetch: handleRequest,
});

console.log(`
  ┌──────────────────────────────────────────────────┐
  │  Dexter Microservice                             │
  │  http://localhost:${String(PORT).padEnd(5)}                          │
  │                                                  │
  │  POST /api/query          Run agent (sync)       │
  │  POST /api/query/stream   Run agent (SSE)        │
  │  GET  /api/health         Health check           │
  │  GET  /api/providers      List providers         │
  │  GET  /api/models/:id     Models per provider    │
  │  DELETE /api/sessions/:k  Clear session          │
  └──────────────────────────────────────────────────┘
`);

logger.info(`[server] Listening on port ${PORT}`);

export { server };
