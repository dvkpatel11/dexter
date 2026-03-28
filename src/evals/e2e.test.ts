import { afterAll, describe, expect, test } from 'bun:test';
import { server } from '../server.js';

describe('End-to-End API and Telemetry Tests', () => {
  afterAll(() => {
    server.stop();
  });

  test('POST /api/query should return financial answer, tools, latency, and runId', async () => {
    // 1. Send request
    const response = await server.fetch(new Request('http://localhost/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'What is the market cap of Apple?',
        model: 'gemini-2.5-flash',
        provider: 'google'
      })
    }));

    expect(response.status).toBe(200);
    const data = await response.json();

    // 2. Assert Data Model / Telemetry
    expect(data.runId).toBeDefined();
    expect(typeof data.runId).toBe('string');
    
    // Check if we hit an API Key error (graceful skip for local dev without keys)
    if (data.answer.includes('API key is invalid') || data.answer.includes('API key not found')) {
      console.log('Skipping LLM-dependent assertions due to missing API keys.');
      return;
    }

    // 3. Assert Efficiency
    expect(data.totalTime).toBeDefined();
    expect(data.totalTime).toBeLessThan(15000); // 15 seconds max
    
    expect(data.tokenUsage).toBeDefined();
    expect(data.tokenUsage.totalTokens).toBeGreaterThan(0);
    expect(data.tokenUsage.totalTokens).toBeLessThan(50000); // 50k tokens max

    // 4. Assert Effectiveness
    expect(data.toolCalls).toBeDefined();
    expect(data.toolCalls.length).toBeGreaterThan(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolNames = data.toolCalls.map((tc: any) => tc.tool);
    expect(toolNames).toContain('financial_search');
    
    expect(data.answer).toBeDefined();
    expect(data.answer.toLowerCase()).toContain('apple');
  }, 20000); // 20s timeout
});
