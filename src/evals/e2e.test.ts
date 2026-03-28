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
        model: 'gpt-5.4' // Or a fast model
      })
    }));

    expect(response.status).toBe(200);
    const data = await response.json();

    // 2. Assert Data Model / Telemetry
    expect(data.runId).toBeDefined();
    expect(typeof data.runId).toBe('string');
    
    // 3. Assert Efficiency
    expect(data.totalTime).toBeDefined();
    expect(data.totalTime).toBeLessThan(15000); // 15 seconds max
    
    expect(data.tokenUsage).toBeDefined();
    expect(data.tokenUsage.totalTokens).toBeGreaterThan(0);
    expect(data.tokenUsage.totalTokens).toBeLessThan(5000);

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
