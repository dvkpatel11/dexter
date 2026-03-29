# Architecture Flattening Plan: FLATTEN_TOOLS Flag

> **For Claude:** REQUIRED SUB-SKILL: Use godmode:task-runner to implement this plan task-by-task.

**Goal:** Allow users with capable models (like Claude 3.5 Sonnet or Gemini 1.5 Pro) to bypass the "Intelligent Meta-Tools" routing layer and pass all ~30 underlying financial sub-tools directly to the top-level Orchestrator agent to eliminate the "No tools selected" failure loop, halve latency, and reduce redundant token burn.

**Architecture:** Introduce an environment variable or config flag (`FLATTEN_TOOLS=true`). When building the tool registry, if this flag is true, we will *omit* `get_financials` and `get_market_data` meta-tools, and instead spread their sub-tools (`getIncomeStatements`, `getStockPrice`, etc.) directly into the `tools` array.

**Tech Stack:** Bun, Langchain, TypeScript.

---

### Task 1: Expose and Export All Sub-Tools

**Files:**
- Modify: `src/tools/finance/get-financials.ts`
- Modify: `src/tools/finance/get-market-data.ts`
- Modify: `src/tools/finance/index.ts`

**Step 1: Export the arrays of sub-tools**

In `src/tools/finance/get-financials.ts`:
Change `const FINANCE_TOOLS: StructuredToolInterface[] = [`
To `export const FINANCE_TOOLS: StructuredToolInterface[] = [`

In `src/tools/finance/get-market-data.ts`:
Change `const MARKET_DATA_TOOLS: StructuredToolInterface[] = [`
To `export const MARKET_DATA_TOOLS: StructuredToolInterface[] = [`

In `src/tools/finance/index.ts`:
Add `export { FINANCE_TOOLS } from './get-financials.js';`
Add `export { MARKET_DATA_TOOLS } from './get-market-data.js';`

**Step 2: Commit**

```bash
git add src/tools/finance/get-financials.ts src/tools/finance/get-market-data.ts src/tools/finance/index.ts
git commit -m "refactor: export sub-tool collections for flattened architecture"
```

### Task 2: Implement the Flattened Tool Registry Logic

**Files:**
- Modify: `src/utils/config.ts`
- Modify: `src/tools/registry.ts`

**Step 1: Read the feature flag**

In `src/utils/config.ts`:
Add an export to check the environment variable:
```typescript
export function isToolsFlattened(): boolean {
  return process.env.FLATTEN_TOOLS === 'true';
}
```

In `src/tools/registry.ts`:
Import `isToolsFlattened` from `../utils/config.js`.
Import `FINANCE_TOOLS` and `MARKET_DATA_TOOLS` from `./finance/index.js`.

Modify `getToolRegistry` to conditionally build the array:

```typescript
export function getToolRegistry(model: string, searchDescription?: string | null): RegisteredTool[] {
  const flattened = isToolsFlattened();

  // Define base non-financial tools
  const tools: RegisteredTool[] = [
    {
      name: 'read_filings',
      tool: createReadFilings(model),
      description: READ_FILINGS_DESCRIPTION,
    },
    // ... [keep other core tools: stock_screener, web_fetch, browser, read_file, write_file, edit_file, etc.]
  ];

  if (flattened) {
    // Add all sub-tools directly
    for (const subTool of [...FINANCE_TOOLS, ...MARKET_DATA_TOOLS]) {
      tools.push({
        name: subTool.name,
        tool: subTool,
        // Since sub-tools don't have rich descriptions defined in constants, just use their native schema description
        description: subTool.description, 
      });
    }
  } else {
    // Legacy Meta-Tool routing
    tools.unshift(
      {
        name: 'get_financials',
        tool: createGetFinancials(model),
        description: GET_FINANCIALS_DESCRIPTION,
      },
      {
        name: 'get_market_data',
        tool: createGetMarketData(model),
        description: GET_MARKET_DATA_DESCRIPTION,
      }
    );
  }

  // Add search and memory tools
  const searchTool = resolveSearchTool();
  if (searchTool) {
    tools.push({
      name: searchTool.name,
      tool: searchTool,
      description: searchDescription || WEB_SEARCH_DESCRIPTION,
    });
  }

  // ... [keep remaining tools]

  return tools;
}
```

*Note: Ensure you reconstruct the array correctly without losing the existing standard tools like calculator, skills, memory, etc.*

**Step 2: Commit**

```bash
git add src/utils/config.ts src/tools/registry.ts
git commit -m "feat: conditionally flatten financial tools based on FLATTEN_TOOLS flag"
```

### Task 3: Improve Semantic Feedback for Meta-Tools

**Files:**
- Modify: `src/tools/finance/get-financials.ts`
- Modify: `src/tools/finance/get-market-data.ts`

**Step 1: Replace generic routing errors**

In `src/tools/finance/get-financials.ts`:
Find: `return formatToolResult({ error: 'No tools selected for query' }, []);`
Replace with:
```typescript
return formatToolResult({ 
  error: 'The get_financials router does not have a sub-tool to answer this specific query. Do NOT repeat this exact query. Try using a different Meta-Tool like get_market_data or web_search.' 
}, []);
```

In `src/tools/finance/get-market-data.ts`:
Find: `return formatToolResult({ error: 'No tools selected for query' }, []);`
Replace with:
```typescript
return formatToolResult({ 
  error: 'The get_market_data router does not have a sub-tool to answer this specific query. Do NOT repeat this exact query. Try using a different Meta-Tool like get_financials or web_search.' 
}, []);
```

**Step 2: Commit**

```bash
git add src/tools/finance/get-financials.ts src/tools/finance/get-market-data.ts
git commit -m "fix: improve meta-tool routing errors to prevent agent infinite loops"
```
