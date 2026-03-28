# Output Types

When skills complete their workflow, structure the final output using one of these
templates. The type depends on what the user asked for. Multiple types can be combined
in a single response (e.g., an Analysis that produces a Signal that informs a Strategy).

---

## Signal

A directional view on a specific instrument. Every signal must trace back to data.

```
### Signal: [TICKER]

**Direction:** Long | Short | Neutral
**Conviction:** High | Medium | Low
**Timeframe:** Days | Weeks | Months | Quarters

**Thesis (1-2 sentences):**
[Why — the core reason, not a summary of everything]

**Key Evidence:**
- [Fact 1 from tool data — with source]
- [Fact 2]
- [Fact 3]

**Invalidation:**
[Specific, measurable condition that would kill this thesis.
Not "if things go badly" — what price, what metric, what event.]

**Catalyst:**
[What unlocks the move, and when. Earnings date, filing, macro event, or "none identified."]
```

---

## Strategy

An actionable plan with defined entries, exits, and risk parameters.
All numbers computed via `calculator`.

```
### Strategy: [Name]

**Instrument(s):** [What to trade]
**Direction:** Long | Short | Hedge | Income

**Entry:**
- Instrument: [Ticker / contract spec]
- Action: Buy | Sell | Write
- Price/Level: [Current or limit]
- Size: [Shares, contracts, or % of portfolio]

**Exit Rules:**
- Target: [Price / % gain] — rationale: [why this level]
- Stop: [Price / % loss] — rationale: [why this level]
- Time: [Max holding period, if applicable]

**Risk/Reward:**
- Max loss: $[X] ([Y]% of position)
- Target gain: $[X] ([Y]% of position)
- R:R ratio: [X]:1

**Hedge (if applicable):**
- [Protective put, collar, pair trade, etc.]

**Dependencies:**
- [What must remain true for this strategy to work]
- [Macro assumption, earnings outcome, etc.]
```

---

## Analysis

Deep research output from a skill workflow (DCF, comps, portfolio review).

```
### Analysis: [Subject]

**Type:** Valuation | Relative Value | Portfolio Review | Sentiment | Technical
**As of:** [Date]

**Summary:**
[2-3 sentence conclusion — lead with the answer, not the process]

**Key Findings:**
1. [Most important finding]
2. [Second]
3. [Third]

**Data Tables:**
[Skill-specific tables — FCF projections, comp matrix, allocation breakdown, etc.]

**Confidence:** High | Medium | Low
**Confidence Rationale:** [Why — data quality, model applicability, assumption sensitivity]

**Limitations:**
- [What this analysis cannot tell you]
- [What data was missing or stale]
```

---

## Alert

Something changed or needs attention. Used by portfolio analysis and heartbeat.

```
### Alert: [Subject]

**Severity:** Critical | Warning | Info
**Instrument:** [TICKER or "Portfolio"]

**What changed:**
[Specific fact — price crossed level, metric deteriorated, position exceeded threshold]

**Why it matters:**
[Impact on thesis, portfolio, or risk]

**Suggested action:**
[What to consider doing — not a command, a recommendation with reasoning]
```

---

## Portfolio Report

Holistic portfolio state. Combines multiple analyses.

```
### Portfolio Report

**As of:** [Date]
**Total value:** $[X]
**Cash position:** $[X] ([Y]%)

**Allocation:**
| Asset Class | Value | Weight | Target | Delta |
|---|---|---|---|---|

**Top Holdings:**
| Ticker | Weight | P&L | Signal |
|---|---|---|---|

**Risk Summary:**
- Portfolio beta: [X]
- HHI (concentration): [X]
- Worst-case scenario: [Name] → [Drawdown %]

**Active Signals:**
[List any current signals from analysis]

**Recommended Actions:**
1. [Priority 1 — what and why]
2. [Priority 2]
3. [Priority 3]
```

---

## Composition Rules

1. **Signal flows into Strategy.** A signal alone is an opinion. A strategy is a plan.
   If the user wants actionable output, always pair them.

2. **Analysis produces Signals.** A DCF that shows 40% upside should emit a Signal.
   A comp that shows overvaluation relative to peers should emit a Signal.
   Don't bury the conclusion inside the analysis.

3. **Portfolio Report aggregates everything.** When running portfolio analysis,
   produce individual analyses/signals first, then roll up into the report.

4. **Alerts are real-time.** Generated when data contradicts a prior thesis,
   a position breaches a threshold, or macro context shifts.

5. **Every number in every output type must come from `calculator` or tool data.**
   No mental math. No approximations. No "roughly" or "about."
