import { runAgent } from "../../runner.js";

async function main() {
  console.log("🚀 Starting Methodic DCF Analysis of AAPL...");
  const startTime = Date.now();

  const result = await runAgent({
    query: "Do a methodic DCF analysis of AAPL using your financial skills. Show your work.",
    model: "gemini-2.5-flash",
    provider: "google",
    maxIterations: 15, // Give it enough iterations to pull financials, estimates, and calculate
    onEvent: (event) => {
      switch (event.type) {
        case "thinking":
          console.log(`\n🤔 THINKING:\n${event.message.trim()}`);
          break;
        case "tool_start":
          console.log(`\n🛠️  TOOL CALLED: ${event.tool}`);
          console.log(`   Args: ${JSON.stringify(event.args)}`);
          break;
        case "tool_end":
          console.log(`   ✅ TOOL FINISHED: ${event.tool} (Result length: ${event.result.length} chars)`);
          break;
        case "done":
          console.log(`\n🏁 AGENT LOOP FINISHED (RunID: ${event.runId})`);
          break;
      }
    },
  });

  console.log("\n================ FINAL ANSWER ================\n");
  console.log(result.answer);
  console.log("\n================ METRICS ================\n");
  console.log(`Total Time: ${(result.totalTime / 1000).toFixed(2)}s`);
  console.log(`Iterations: ${result.iterations}`);
  console.log(`Total Tokens: ${result.tokenUsage?.totalTokens || "unknown"}`);
  console.log(`Run ID (LangSmith): ${result.runId}`);
}

main().catch(console.error);
