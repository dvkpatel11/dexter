#!/usr/bin/env bun
/**
 * Agent Performance Benchmark
 *
 * Measures overhead at each layer of the agent pipeline:
 *   1. Config & setup time (settings load, env resolution)
 *   2. Tool registration time (building tool registry)
 *   3. Agent creation time (Agent.create — prompt building, memory load, tool init)
 *   4. LLM round-trip latency (first call to provider)
 *   5. Tool execution latency (individual finance API calls)
 *   6. End-to-end query time (full agent run)
 *
 * Usage:
 *   bun run src/tools/finance/test-benchmark.ts
 *   bun run src/tools/finance/test-benchmark.ts --runs 5
 */
import 'dotenv/config';

import { Agent } from '../../agent/agent.js';
import type { DoneEvent, ToolEndEvent } from '../../agent/types.js';
import { callLlm } from '../../model/llm.js';
import { getSetting } from '../../utils/config.js';
import { getTools } from '../../tools/registry.js';
import { api, finnhub, fmp, edgar } from './api.js';

// ── Config ───────────────────────────────────────────────────────────────────

const RUNS = Number(process.argv.find(a => a.match(/^--runs$/))
  ? process.argv[process.argv.indexOf('--runs') + 1]
  : 1);

const TEST_QUERY = 'What is AAPL current stock price and P/E ratio?';

interface Timing {
  label: string;
  ms: number;
  detail?: string;
}

const timings: Timing[] = [];

function time(label: string): (detail?: string) => void {
  const start = performance.now();
  return (detail?: string) => {
    timings.push({ label, ms: Math.round(performance.now() - start), detail });
  };
}

// ── 1. Config Load ───────────────────────────────────────────────────────────

async function benchConfig(): Promise<void> {
  const done = time('Config load (settings.json)');
  const provider = getSetting('provider', 'openai');
  const model = getSetting('modelId', 'gpt-5.4');
  done(`provider=${provider}, model=${model}`);
}

// ── 2. Tool Registration ─────────────────────────────────────────────────────

async function benchToolRegistration(): Promise<void> {
  const model = getSetting('modelId', 'gpt-5.4');
  const done = time('Tool registration (getTools)');
  const tools = getTools(model);
  done(`${tools.length} tools registered`);
}

// ── 3. Agent Creation ────────────────────────────────────────────────────────

async function benchAgentCreation(): Promise<void> {
  const model = getSetting('modelId', 'gpt-5.4');
  const provider = getSetting('provider', 'openai');
  const done = time('Agent.create()');
  const agent = await Agent.create({
    model,
    modelProvider: provider,
    maxIterations: 1,
    memoryEnabled: false,
  });
  done('agent ready');
}

// ── 4. Raw LLM Round-Trip ────────────────────────────────────────────────────

async function benchLlmRoundTrip(): Promise<void> {
  const model = getSetting('modelId', 'gpt-5.4');
  const done = time('LLM round-trip (no tools)');
  const { response, usage } = await callLlm('Say "hello" in one word.', {
    model,
    systemPrompt: 'You are a test.',
  });
  const tokens = usage?.totalTokens ?? 0;
  done(`${tokens} tokens`);
}

// ── 5. Individual API Call Latencies ─────────────────────────────────────────

async function benchApiCalls(): Promise<void> {
  // Polygon
  {
    const done = time('Polygon: /v2/aggs/ticker/AAPL/prev');
    const { data } = await api.get('/v2/aggs/ticker/AAPL/prev');
    const results = (data.results as unknown[]) || [];
    done(`${results.length} result(s)`);
  }

  // Polygon financials
  {
    const done = time('Polygon: /vX/reference/financials');
    const { data } = await api.get('/vX/reference/financials', { ticker: 'AAPL', timeframe: 'annual', limit: 1 });
    const results = (data.results as unknown[]) || [];
    done(`${results.length} filing(s)`);
  }

  // FMP
  {
    const done = time('FMP: /key-metrics-ttm');
    const { data } = await fmp.get('/key-metrics-ttm', { symbol: 'AAPL' });
    const fields = typeof data === 'object' && data ? Object.keys(data).length : 0;
    done(`${fields} metrics`);
  }

  // Finnhub
  {
    const done = time('Finnhub: /stock/insider-transactions');
    const { data } = await finnhub.get('/stock/insider-transactions', { symbol: 'AAPL' });
    const txns = (data.data as unknown[]) || [];
    done(`${txns.length} transactions`);
  }

  // EDGAR
  {
    const done = time('EDGAR: /api/xbrl/companyfacts');
    const { data } = await edgar.get('/api/xbrl/companyfacts/CIK0000320193.json', 'AAPL facts');
    done(`entity=${data.entityName}`);
  }
}

// ── 6. Full Agent Run ────────────────────────────────────────────────────────

async function benchFullRun(): Promise<void> {
  const model = getSetting('modelId', 'gpt-5.4');
  const provider = getSetting('provider', 'openai');

  const toolTimings: { tool: string; ms: number }[] = [];
  let iterations = 0;
  let totalTokens = 0;
  let answer = '';

  const done = time('Full agent run (end-to-end)');
  const agent = await Agent.create({
    model,
    modelProvider: provider,
    maxIterations: 10,
    channel: 'api',
    memoryEnabled: false,
  });

  for await (const event of agent.run(TEST_QUERY)) {
    if (event.type === 'tool_end') {
      const te = event as ToolEndEvent;
      toolTimings.push({ tool: te.tool, ms: te.duration });
    }
    if (event.type === 'done') {
      const de = event as DoneEvent;
      iterations = de.iterations;
      totalTokens = de.tokenUsage?.totalTokens ?? 0;
      answer = de.answer;
    }
  }

  const toolSummary = toolTimings.map(t => `${t.tool}(${t.ms}ms)`).join(', ');
  done(`${iterations} iters, ${totalTokens} tokens, tools: ${toolSummary}`);

  // Add individual tool breakdowns
  for (const t of toolTimings) {
    timings.push({ label: `  └─ ${t.tool}`, ms: t.ms });
  }

  // Show answer preview
  if (answer) {
    timings.push({ label: '  └─ Answer preview', ms: 0, detail: answer.slice(0, 150) + (answer.length > 150 ? '...' : '') });
  }
}

// ── Runner ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n  ══════════════════════════════════════════════════════');
  console.log('  Dexter Agent Performance Benchmark');
  console.log(`  Query: "${TEST_QUERY}"`);
  console.log(`  Runs: ${RUNS}`);
  console.log('  ══════════════════════════════════════════════════════\n');

  for (let run = 0; run < RUNS; run++) {
    if (RUNS > 1) console.log(`  ── Run ${run + 1}/${RUNS} ──\n`);

    timings.length = 0;

    await benchConfig();
    await benchToolRegistration();
    await benchAgentCreation();
    await benchLlmRoundTrip();
    await benchApiCalls();
    await benchFullRun();

    // Print results
    console.log('  ── Timings ─────────────────────────────────────────\n');

    const maxLabel = Math.max(...timings.map(t => t.label.length));
    let totalOverhead = 0;
    let totalApi = 0;
    let totalE2E = 0;

    for (const t of timings) {
      const pad = ' '.repeat(maxLabel - t.label.length);
      const msStr = t.ms > 0 ? `${String(t.ms).padStart(6)}ms` : '       ';
      const detail = t.detail ? `  ${t.detail}` : '';
      console.log(`  ${t.label}${pad}  ${msStr}${detail}`);

      // Categorize
      if (t.label.startsWith('Config') || t.label.startsWith('Tool reg') || t.label.startsWith('Agent.create')) {
        totalOverhead += t.ms;
      }
      if (t.label.startsWith('Polygon') || t.label.startsWith('FMP') || t.label.startsWith('Finnhub') || t.label.startsWith('EDGAR')) {
        totalApi += t.ms;
      }
      if (t.label.startsWith('Full agent')) {
        totalE2E = t.ms;
      }
    }

    const llmTime = timings.find(t => t.label.startsWith('LLM'))?.ms ?? 0;

    console.log('\n  ── Summary ─────────────────────────────────────────\n');
    console.log(`  Setup overhead:    ${String(totalOverhead).padStart(6)}ms  (config + tools + agent.create)`);
    console.log(`  LLM round-trip:    ${String(llmTime).padStart(6)}ms  (bare call, no tools)`);
    console.log(`  API calls (sum):   ${String(totalApi).padStart(6)}ms  (Polygon + FMP + Finnhub + EDGAR)`);
    console.log(`  End-to-end:        ${String(totalE2E).padStart(6)}ms  (full agent query)`);
    if (totalE2E > 0) {
      const agentOverhead = totalE2E - totalApi;
      console.log(`  Agent overhead:    ${String(agentOverhead).padStart(6)}ms  (e2e minus API — includes LLM routing)`);
      console.log(`  Overhead ratio:    ${((agentOverhead / totalE2E) * 100).toFixed(1)}%  (of total e2e time)`);
    }
    console.log('');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
