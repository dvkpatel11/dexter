# Repository Guidelines

- Repo: https://github.com/virattt/dexter
- Dexter is a CLI-based AI agent for deep financial research, built with TypeScript, Ink (React for CLI), and LangChain.

## Project Structure

- Source code: `src/`
  - Agent core: `src/agent/` (agent loop, prompts, scratchpad, token counting, types)
  - CLI interface: `src/cli.ts` (Ink/React), entry point: `src/index.tsx`
  - Components: `src/components/` (Ink UI components)
  - Model/LLM: `src/model/llm.ts` (multi-provider LLM abstraction)
  - Tools: `src/tools/` (financial search, web search, browser, skill tool)
  - Tool descriptions: `src/tools/descriptions/` (rich descriptions injected into system prompt)
  - Finance tools: `src/tools/finance/` (prices, fundamentals, filings, insider trades, etc.)
  - Search tools: `src/tools/search/` (Exa preferred, Tavily fallback)
  - Browser: `src/tools/browser/` (Playwright-based web scraping)
  - Skills: `src/skills/` (SKILL.md-based extensible workflows, e.g. DCF valuation)
  - Utils: `src/utils/` (env, config, caching, token estimation, markdown tables)
  - Evals: `src/tests/eval` (LangSmith evaluation runner with Ink UI)
  - Gateway: `src/gateway/` (WhatsApp, REST API, routing, access control)
- Config: `.dexter/settings.json` (persisted model/provider selection)
- Environment: `.env` (API keys; see `env.example`)
- Scripts: `scripts/release.sh`

## Build, Test, and Development Commands

### Runtime & Dependencies

- Runtime: Bun (primary). Use `bun` for all commands.
- Install deps: `bun install`

### Running

- Start CLI: `bun run start` or `bun run src/index.tsx`
- Dev mode (watch): `bun run dev`
- Start REST API server: `bun run serve` or `bun run serve:dev` (watch)

### Type Checking & Linting

- Type-check: `bun run typecheck` (runs `tsc --noEmit`)

### Testing

- Run all tests: `bun test`
- Run specific test file: `bun test src/utils/cache.test.ts`
- Run tests matching pattern: `bun test --test-name-pattern "buildCacheKey"`
- Run tests in a specific file with pattern: `bun test src/agent/agent.test.ts --test-name-pattern "error handling"`
- Jest config exists at `jest.config.js` for legacy compatibility (uses `ts-jest`)

### Other Commands

- Diagnostics: `bun run diagnose`
- Evals (full): `bun run src/tests/evalrun.ts`
- Evals (sampled): `bun run src/tests/evalrun.ts --sample 10`
- Gateway: `bun run gateway`

### CI Pipeline

CI runs `bun run typecheck` and `bun test` on push/PR.

## Coding Style & Conventions

### Language & Tooling

- TypeScript with ESM (`"type": "module"` in package.json)
- Strict mode enabled (see `tsconfig.json`)
- Path aliases: `@/*` maps to `src/*` (use in imports)
- JSX via React (Ink for CLI rendering) — prefer `@mariozechner/pi-tui` components

### Imports

- Use path aliases: `import { foo } from '@/utils/foo.js'`
- Group imports: 1) external packages, 2) internal `@/` aliases, 3) relative imports
- Use `.js` extension for ESM compatibility: `import { x } from '@/utils/x.js'`

### Naming Conventions

- **Files**: kebab-case (`my-file.ts`) or PascalCase for classes (`MyClass.ts`)
- **Classes**: PascalCase (`class Agent`, `class MemoryManager`)
- **Functions/variables**: camelCase (`getChatModel`, `isValidInput`)
- **Constants**: SCREAMING_SNAKE_CASE (`DEFAULT_MODEL`, `MAX_ITERATIONS`)
- **Types/Interfaces**: PascalCase (`interface AgentConfig`, `type TokenUsage`)
- **Enums**: PascalCase members (`ErrorType.ContextOverflow`)

### Type Safety

- Avoid `any`; use `unknown` when type is truly unknown
- Use `zod` for runtime validation (see `src/utils/errors.ts` for patterns)
- Prefer `interface` over `type` for object shapes
- Use explicit return types for public functions

### Error Handling

- Use `src/utils/errors.ts` functions: `classifyError()`, `isContextOverflowError()`, etc.
- Pattern for catching errors:
  ```typescript
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // handle based on error type
  }
  ```
- Non-retryable errors: context overflow, billing, auth failures
- Retry with exponential backoff for transient failures

### React/Ink Components

- Extend `Container` from `@mariozechner/pi-tui`
- Use existing components in `src/components/` as reference
- Component pattern:
  ```typescript
  export class MyComponent extends Container {
    private readonly child: SomeComponent;
    constructor(initialValue = "") {
      super();
      this.child = new SomeComponent();
      this.addChild(this.child);
    }
  }
  ```

### File Organization

- Keep files concise (~200-300 lines max)
- Extract helpers rather than duplicating code
- Colocate tests as `*.test.ts` next to source files
- Use index files (`index.ts`) for barrel exports

### Comments

- Add brief comments for tricky or non-obvious logic
- Use JSDoc for public APIs (`/** */`)
- Avoid unnecessary comments on self-explanatory code

### Logging

- Use `logger` from `@/utils` for structured logging
- Do not add console.log statements
- Error messages should be informative but not verbose

### What NOT to Do

- Do not add logging unless explicitly asked
- Do not create README or documentation files unless explicitly asked
- Do not commit `.env` files or real API keys
- Do not push or publish without user confirmation

## LLM Providers

- Supported: OpenAI (default), Anthropic, Google, xAI (Grok), OpenRouter, Ollama (local), DeepSeek, Moonshot
- Default model: `gpt-5.4`
- Provider detection is prefix-based (`claude-` -> Anthropic, `gemini-` -> Google, etc.)
- Fast models for lightweight tasks: see `FAST_MODELS` map in `src/model/llm.ts`
- Anthropic uses explicit `cache_control` on system prompt for prompt caching cost savings
- Users switch providers/models via `/model` command in the CLI

## Tools

- `financial_search`: primary tool for all financial data queries (prices, metrics, filings)
- `financial_metrics`: direct metric lookups (revenue, market cap, etc.)
- `read_filings`: SEC filing reader for 10-K, 10-Q, 8-K documents
- `web_search`: general web search (Exa > Perplexity > Tavily based on available keys)
- `browser`: Playwright-based web scraping
- `skill`: invokes SKILL.md-defined workflows
- `read_file`, `write_file`, `edit_file`: filesystem operations (require approval)
- `memory_search`, `memory_get`, `memory_update`: persistent memory
- Tool registry: `src/tools/registry.ts`. Tools conditionally included based on env vars.

## Skills

- Skills live as `SKILL.md` files with YAML frontmatter (`name`, `description`) and markdown body
- Built-in skills: `src/skills/dcf/SKILL.md` (DCF valuation)
- Discovery: `src/skills/registry.ts` scans for SKILL.md files at startup
- Skills exposed to LLM via metadata in system prompt; LLM invokes via `skill` tool

## Agent Architecture

- Agent loop: `src/agent/agent.ts`. Iterative tool-calling loop with configurable max iterations (default 10)
- Scratchpad: `src/agent/scratchpad.ts`. Single source of truth for all tool results within a query
- Context management: Anthropic-style. Full tool results in context; oldest cleared when threshold exceeded
- Final answer: generated in separate LLM call with full scratchpad context (no tools bound)
- Events: agent yields typed events (`tool_start`, `tool_end`, `thinking`, `answer_start`, `done`, etc.)

## Environment Variables

### LLM Providers

- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`, `OPENROUTER_API_KEY`
- `DEEPSEEK_API_KEY`, `MOONSHOT_API_KEY`, `PERPLEXITY_API_KEY`

### Local Models

- `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`)

### External Services

- `FINANCIAL_DATASETS_API_KEY` (financial data)
- `EXASEARCH_API_KEY` (web search, preferred)
- `TAVILY_API_KEY` (web search, fallback)

### Tracing

- `LANGSMITH_API_KEY`, `LANGSMITH_ENDPOINT`, `LANGSMITH_PROJECT`, `LANGSMITH_TRACING`

## Version & Release

- Version format: CalVer `YYYY.M.D` (no zero-padding)
- Tag prefix: `v`
- Release script: `bash scripts/release.sh [version]` (defaults to today's date)
- Release flow: bump version in `package.json`, create git tag, push tag, create GitHub release via `gh`

## Testing Guidelines

- Framework: Bun's built-in test runner (primary)
- Tests colocated as `*.test.ts` next to source files
- Use `describe`, `test`, `expect` from `bun:test`
- Use `beforeEach`/`afterEach` for setup/teardown
- Run `bun test` before pushing when you touch logic
- Test patterns from `src/utils/cache.test.ts` as reference

## Security

- API keys stored in `.env` (gitignored)
- Config stored in `.dexter/settings.json` (gitignored)
- Never commit or expose real API keys, tokens, or credentials
- Filesystem tool operations require user approval
