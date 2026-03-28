---
name: portfolio-analysis
description: >
  Comprehensive portfolio analysis across multiple asset classes — equities, options,
  commodities, fixed income, and cash. Triggers when user asks to analyze their portfolio,
  review holdings, check allocation, assess risk, rebalance, "how does my portfolio look",
  portfolio construction, position sizing, correlation analysis, or any multi-holding
  evaluation. Also triggers for questions about diversification, concentration risk,
  or portfolio optimization.
---

# Portfolio Analysis

> *"Diversification is protection against ignorance. It makes little sense if you know what you are doing."* — Buffett
>
> *"The idea of excessive diversification is madness."* — Munger

And yet — concentration without conviction is just gambling with more confidence. The
question is never "how many positions" but "how well do you understand each one."

Ray Dalio taught us that risk parity and uncorrelated return streams can produce better
risk-adjusted returns than any single brilliant bet. Howard Marks taught us that superior
investing is not about what you buy — it is about what you pay, and how you size it
relative to your conviction and your capacity for pain.

This skill synthesizes both schools: the Buffett/Munger tradition of concentrated,
high-conviction positions in deeply understood businesses, and the Dalio/Marks tradition
of systematic risk management across asset classes. The portfolio should reflect not just
what you believe, but how much uncertainty surrounds each belief.

Modern portfolio analysis is not Modern Portfolio Theory. MPT assumes normal distributions
and stable correlations — assumptions that break precisely when you need them most. We
think in terms of scenarios, tail risks, and the question that matters: *what happens to
this portfolio in the worst plausible environment?*

---

## Workflow

```
Portfolio Analysis Progress:
- [ ] Step 1: Inventory holdings and classify
- [ ] Step 2: Fetch current data for all positions
- [ ] Step 3: Analyze allocation structure
- [ ] Step 4: Assess concentration risk
- [ ] Step 5: Evaluate factor exposures
- [ ] Step 6: Stress-test scenarios
- [ ] Step 7: Income and cash flow analysis
- [ ] Step 8: Synthesize and recommend
```

---

## Step 1: Inventory Holdings and Classify

Parse the user's holdings into a structured inventory. For each position, identify:

| Field | Description |
|---|---|
| Instrument | Stock, ETF, option, commodity, bond, cash |
| Ticker/Name | Identifier |
| Quantity | Shares, contracts, notional |
| Cost basis | Per-unit entry price (if provided) |
| Asset class | Equity, fixed income, commodity, cash equivalent, derivative |

If the user provides a partial list, ask what's missing. A portfolio analysis with hidden
positions is like a physical exam where the patient won't take off their coat.

---

## Step 2: Fetch Current Data

For each holding type, use the appropriate tool:

**Equities/ETFs:**
```
get_market_data: "[TICKER1] [TICKER2] ... price snapshot"
get_financials: "[TICKER1] [TICKER2] ... financial metrics snapshot"
```

**Options:** Extract underlying price, strike, expiry, type (call/put) from user input.
Use `calculator` for Black-Scholes or intrinsic value if needed.

**Commodities:** `get_market_data` for commodity price or proxy ETF.

**Fixed income/cash:** Note yield and duration from user input or known benchmarks.

Use `calculator` to compute current market value for each position:
```
calculator({ operation: "multiply", values: [quantity, current_price], label: "[TICKER] market value" })
```

---

## Step 3: Analyze Allocation Structure

Use `calculator` for all weight computations. No approximations.

### 3.1 Asset Class Weights
```
calculator({ operation: "divide", values: [class_total, portfolio_total], label: "Equity weight" })
```

Produce a table:
| Asset Class | Market Value | Weight |
|---|---|---|

### 3.2 Sector Exposure (for equities)
Group equity holdings by sector (from company facts). Calculate sector weights.

### 3.3 Geographic Exposure
If discernible from holdings, note domestic vs. international split.

### 3.4 Individual Position Weights
Flag any single position exceeding:
- **10%** of total portfolio — notable concentration
- **20%** — high conviction or high risk, depending on context
- **30%+** — requires explicit justification

---

## Step 4: Assess Concentration Risk

Use `calculator` for all metrics.

### 4.1 Herfindahl-Hirschman Index (HHI)
```
For each position weight w_i:
  calculator({ operation: "power", values: [w_i, 2] })
Sum all squared weights:
  calculator({ operation: "sum", values: [w1_sq, w2_sq, ...], label: "HHI" })
```

Interpret:
- HHI < 0.10 → Well diversified
- HHI 0.10-0.20 → Moderately concentrated
- HHI > 0.20 → Concentrated (not inherently bad — but must be intentional)

### 4.2 Top-N Concentration
```
calculator({ operation: "sum", values: [top3_weights], label: "Top 3 concentration" })
```

### 4.3 Correlation Assessment
Qualitative assessment of correlation between top holdings:
- Same sector? Same macro sensitivity? Same customer base?
- Positions that *look* diversified but move together in stress are false diversification

---

## Step 5: Evaluate Factor Exposures

Assess the portfolio's sensitivity to common risk factors:

| Factor | How to Assess | Tool |
|---|---|---|
| **Market beta** | Weighted avg beta of equity positions | `calculator` (wacc operation for weighted avg) |
| **Interest rate** | Duration of fixed income + rate-sensitive equities | Qualitative + data |
| **Value vs Growth** | P/E, P/B distribution across holdings | `get_financials` metrics |
| **Size** | Market cap distribution | `get_financials` company facts |
| **Momentum** | Recent price performance of holdings | `get_market_data` historical |
| **Commodity** | Direct commodity exposure + commodity-sensitive equities | Holdings classification |
| **Currency** | International revenue exposure | Qualitative from company facts |

For quantitative factors, use `calculator`:
```
calculator({
  operation: "wacc",
  values: [beta_1, beta_2, beta_3, ...],
  weights: [weight_1, weight_2, weight_3, ...],
  label: "Portfolio weighted beta"
})
```

---

## Step 6: Stress-Test Scenarios

Run the portfolio through at least 3 scenarios. For each, estimate impact using `calculator`:

### 6.1 Rate Shock (+200bps)
- Fixed income: Use duration to estimate price impact
- Equities: Growth/high-multiple names get hit hardest
- Use `calculator` to estimate portfolio-level drawdown

### 6.2 Recession (-30% equities, credit spreads widen)
- Apply sector-specific drawdown estimates (consumer discretionary: -40%, staples: -15%, etc.)
- Fixed income may rally (flight to safety)
- `calculator` for weighted portfolio impact

### 6.3 Inflation Spike
- Commodities benefit
- Long-duration bonds suffer
- Pricing-power companies (high margins, brand moats) fare better

### 6.4 Custom Scenario (if relevant)
Based on the specific holdings, construct a scenario that targets the portfolio's
specific vulnerabilities.

For each scenario:
```
calculator({ operation: "sum", values: [position1_impact, position2_impact, ...], label: "Scenario: Recession total impact" })
calculator({ operation: "percent_change", values: [portfolio_total, portfolio_total + total_impact], label: "Recession drawdown %" })
```

---

## Step 7: Income and Cash Flow Analysis

### 7.1 Dividend/Yield Income
For dividend-paying stocks and income instruments:
```
calculator({ operation: "multiply", values: [shares, annual_dividend], label: "[TICKER] annual income" })
calculator({ operation: "sum", values: [all_income_streams], label: "Total annual income" })
calculator({ operation: "divide", values: [total_income, portfolio_total], label: "Portfolio yield" })
```

### 7.2 Options Income (if applicable)
- Covered call premium, put income
- Note expiry dates and assignment risk

### 7.3 Cash Drag
```
calculator({ operation: "divide", values: [cash_position, portfolio_total], label: "Cash drag %" })
```
- <5% → Efficient deployment
- 5-15% → Reasonable dry powder
- \>15% → Significant opportunity cost in most environments

---

## Step 8: Synthesize and Recommend

### Portfolio Scorecard

| Dimension | Assessment | Score |
|---|---|---|
| Diversification | HHI-based + qualitative | /10 |
| Risk management | Scenario survival | /10 |
| Income generation | Yield vs. objectives | /10 |
| Factor balance | Exposure spread | /10 |
| Cash efficiency | Deployment level | /10 |

### Key Findings
Top 3-5 observations, ordered by importance. Lead with risks.

### Actionable Recommendations
Specific, prioritized suggestions. For each:
- What to do
- Why (which risk or inefficiency it addresses)
- Trade-off (what you give up)

Be honest about what you *don't* know. A portfolio analysis without context on the
investor's goals, time horizon, tax situation, and risk tolerance is necessarily
incomplete. State your assumptions and note where the recommendations would change
if those assumptions are wrong.

---

## Shared Context

Before starting, read the current macro environment if available:
[macro-context.md](../shared/macro-context.md)

Use the risk framework for position sizing guidance:
[risk-framework.md](../shared/risk-framework.md)

---

> *"Risk means more things can happen than will happen."* — Elroy Dimson
>
> The portfolio is not a collection of positions. It is a system — and systems have
> emergent properties that individual positions do not. Two uncorrelated 20% drawdown
> risks can combine into a 35% portfolio drawdown or a 10% one, depending on when and
> how they occur together. The analysis must see the forest, not just count the trees.
