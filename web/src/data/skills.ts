// Agent skill definitions for the showcase UI.
// Sourced from src/skills/SKILL.md files.

export interface Skill {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;          // Lucide icon name
  outputs: string[];
  examplePrompt: string;
}

export interface Objective {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  prompt: string;
  skills: string[];      // skill IDs used
}

// ── Skills ───────────────────────────────────────────────────────────────

export const SKILLS: Skill[] = [
  {
    id: "dcf",
    name: "DCF Valuation",
    tagline: "Intrinsic value from first principles",
    description:
      "Multi-stage discounted cash flow with WACC estimation, 5-year FCF projections, terminal value via Gordon Growth, and a 3x3 sensitivity matrix. Tells you what a stock is actually worth.",
    icon: "Calculator",
    outputs: ["Fair value per share", "Sensitivity matrix", "FCF projections", "Key assumptions table"],
    examplePrompt: "Run a DCF on AAPL with conservative assumptions",
  },
  {
    id: "comps",
    name: "Comparable Companies",
    tagline: "Relative valuation across peer sets",
    description:
      "Benchmarks a company against 4-8 peers on EV/EBITDA, P/E, PEG, and growth-adjusted multiples. Derives an implied valuation range and tells you if the premium is justified.",
    icon: "BarChart3",
    outputs: ["Peer comparison matrix", "Implied valuation range", "Premium/discount analysis"],
    examplePrompt: "How does MSFT compare to its cloud peers?",
  },
  {
    id: "technical",
    name: "Technical Analysis",
    tagline: "Price structure, trend, and timing",
    description:
      "Weinstein stage analysis, moving averages, RSI, ATR-based stops, support/resistance mapping, and volume confirmation. Defines risk/reward levels with invalidation prices.",
    icon: "TrendingUp",
    outputs: ["Trend & stage classification", "Key levels table", "Signal with invalidation", "Indicator summary"],
    examplePrompt: "Give me the technical picture on NVDA",
  },
  {
    id: "options",
    name: "Options Strategy",
    tagline: "Volatility, Greeks, and structured positions",
    description:
      "Evaluates IV environment, selects optimal strategy (spreads, straddles, covered calls), computes Greeks, models P&L across scenarios, and defines exit rules.",
    icon: "Layers",
    outputs: ["Strategy structure", "Greeks summary", "P&L scenario table", "Exit plan"],
    examplePrompt: "What's the best options play on TSLA earnings?",
  },
  {
    id: "portfolio",
    name: "Portfolio Analysis",
    tagline: "Concentration, factor exposure, and stress tests",
    description:
      "Full portfolio review: allocation by asset class and sector, HHI concentration scoring, factor exposure (beta, duration, momentum), and stress scenarios (recession, rate shock, inflation).",
    icon: "PieChart",
    outputs: ["Portfolio scorecard", "Allocation breakdown", "Stress test results", "Actionable recommendations"],
    examplePrompt: "Analyze my portfolio for concentration risk",
  },
  {
    id: "rebalancer",
    name: "Portfolio Rebalancer",
    tagline: "Drift correction with exact trade lists",
    description:
      "Compares current allocation against targets, calculates drift, generates precise buy/sell trades with tax-aware account placement and minimum trade thresholds.",
    icon: "Scale",
    outputs: ["Trade list with quantities", "Before/after allocation", "Drift residuals", "Fee estimates"],
    examplePrompt: "Rebalance my portfolio to 60/40 stocks and bonds",
  },
  {
    id: "x-research",
    name: "Social Sentiment",
    tagline: "Real-time narrative from financial Twitter",
    description:
      "Searches X/Twitter for market sentiment using cashtags, expert accounts, and keyword operators. Groups themes (bullish/bearish), assesses tone, and checks for reflexivity.",
    icon: "MessageCircle",
    outputs: ["Sentiment themes", "Key voices & quotes", "Overall tone assessment", "Reflexivity analysis"],
    examplePrompt: "What is Twitter saying about the AMZN pullback?",
  },
  {
    id: "trade",
    name: "Trade Execution",
    tagline: "Risk-sized orders ready for approval",
    description:
      "Takes any thesis (from DCF, technicals, sentiment) and produces a fully specified order: position size via risk budget, entry/stop/target levels, R:R gating, and account placement.",
    icon: "ArrowRightLeft",
    outputs: ["Order specification", "Risk/reward table", "Exit rules", "Post-trade concentration check"],
    examplePrompt: "I want to buy GOOG — size it for me",
  },
];

// ── Financial Objective Templates ────────────────────────────────────────

export const OBJECTIVES: Objective[] = [
  {
    id: "equity-deep-dive",
    name: "Equity Deep Dive",
    tagline: "Full fundamental analysis with a verdict",
    description:
      "Comprehensive analysis combining financials, DCF valuation, peer comps, technical setup, and social sentiment into a single buy/hold/sell recommendation.",
    icon: "Search",
    prompt: "Do a full equity deep dive on {TICKER}: financials, DCF, comps, technicals, and a final recommendation",
    skills: ["dcf", "comps", "technical", "x-research"],
  },
  {
    id: "portfolio-health-check",
    name: "Portfolio Health Check",
    tagline: "Risk audit with rebalancing suggestions",
    description:
      "Reviews your entire portfolio for concentration risk, sector drift, factor exposures, and runs stress tests against recession and rate shock scenarios.",
    icon: "ShieldCheck",
    prompt: "Run a full health check on my portfolio — concentration, factors, stress tests, and rebalancing suggestions",
    skills: ["portfolio", "rebalancer"],
  },
  {
    id: "earnings-preview",
    name: "Earnings Preview",
    tagline: "Pre-earnings analysis with options positioning",
    description:
      "Analyzes consensus estimates, surprise history, IV levels, and social sentiment ahead of earnings. Recommends options strategies for the event.",
    icon: "CalendarClock",
    prompt: "Give me an earnings preview for {TICKER} — estimates, IV analysis, sentiment, and an options play",
    skills: ["comps", "options", "x-research"],
  },
  {
    id: "sector-screen",
    name: "Sector Rotation Screen",
    tagline: "Find momentum with fundamentals",
    description:
      "Screens for stocks showing sector-level momentum paired with strong fundamentals: revenue growth, margin expansion, and reasonable valuations.",
    icon: "Radar",
    prompt: "Screen for stocks in sectors showing momentum with strong revenue growth and reasonable valuations",
    skills: ["comps", "technical"],
  },
  {
    id: "income-strategy",
    name: "Income Strategy",
    tagline: "Yield from dividends, covered calls, and alternatives",
    description:
      "Identifies high-quality dividend stocks, covered call candidates, and fixed-income alternatives to build a sustainable income stream from your portfolio.",
    icon: "Landmark",
    prompt: "Build me an income strategy — dividend stocks, covered call candidates, and bond alternatives yielding 4%+",
    skills: ["portfolio", "options"],
  },
  {
    id: "risk-assessment",
    name: "Risk Assessment",
    tagline: "Stress-test against macro scenarios",
    description:
      "Models portfolio impact under rate hikes, recession, inflation spikes, and sector rotation. Quantifies max drawdown and suggests hedging strategies.",
    icon: "TriangleAlert",
    prompt: "Stress-test my portfolio against rate hikes, recession, and inflation — suggest hedges",
    skills: ["portfolio", "options"],
  },
];
