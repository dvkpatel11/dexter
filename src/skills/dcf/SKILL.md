---
name: dcf-valuation
description: >
  Performs discounted cash flow (DCF) valuation analysis to estimate intrinsic value
  per share. Triggers when user asks for fair value, intrinsic value, DCF, valuation,
  "what is X worth", price target, undervalued/overvalued analysis, or wants to compare
  current price to fundamental value.
---

# DCF Valuation

> *"Price is what you pay; value is what you get."* — Warren Buffett

A DCF is not a prediction. It is a disciplined thought exercise: what must be true about
the future for this price to make sense? The output is not a number — it is a range of
outcomes weighted by the assumptions that drive them. Anyone can plug numbers into a
formula. The craft is in choosing the right inputs, stress-testing them honestly, and
knowing when the model's answer is less reliable than your uncertainty about its inputs.

We stand on the shoulders of John Burr Williams, who first formalized intrinsic value as
the present value of future cash flows in 1938. We refine his framework with modern
computational precision — every calculation runs through the `calculator` tool, never
mental arithmetic. Real money demands real math.

---

## Workflow

```
DCF Progress:
- [ ] Step 1: Gather financial data
- [ ] Step 2: Establish FCF growth rate
- [ ] Step 3: Determine discount rate (WACC)
- [ ] Step 4: Project cash flows and terminal value
- [ ] Step 5: Derive intrinsic value per share
- [ ] Step 6: Stress-test via sensitivity analysis
- [ ] Step 7: Validate against reality
- [ ] Step 8: Present with intellectual honesty
```

---

## Step 1: Gather Financial Data

Call `get_financials` and `get_market_data` to build the factual foundation. Never assume — fetch.

### 1.1 Cash Flow History
**Query:** `"[TICKER] annual cash flow statements for the last 5 years"`
**Extract:** `free_cash_flow`, `net_cash_flow_from_operations`, `capital_expenditure`
**Fallback:** If `free_cash_flow` missing, use `calculator` → `subtract([operating_cf, capex])`

### 1.2 Financial Metrics
**Query:** `"[TICKER] financial metrics snapshot"`
**Extract:** `market_cap`, `enterprise_value`, `free_cash_flow_growth`, `revenue_growth`, `return_on_invested_capital`, `debt_to_equity`, `free_cash_flow_per_share`

### 1.3 Balance Sheet
**Query:** `"[TICKER] latest balance sheet"`
**Extract:** `total_debt`, `cash_and_equivalents`, `current_investments`, `outstanding_shares`
**Fallback:** If `current_investments` missing, use 0

### 1.4 Analyst Estimates
**Query:** `"[TICKER] analyst estimates"`
**Extract:** `earnings_per_share` (forward estimates by fiscal year)
**Use:** `calculator` to compute implied EPS growth rate for cross-validation

### 1.5 Current Price
**Query (get_market_data):** `"[TICKER] price snapshot"`

### 1.6 Company Facts
**Query:** `"[TICKER] company facts"`
**Extract:** `sector`, `industry`, `market_cap`
**Use:** Map to WACC range from [sector-wacc.md](../shared/sector-wacc.md)

---

## Step 2: Establish FCF Growth Rate

Use `calculator` with operation `cagr` to compute 5-year FCF CAGR:
```
calculator({ operation: "cagr", values: [earliest_fcf, latest_fcf], periods: 4 })
```

**Cross-validate** (use `calculator` for each):
- Computed CAGR vs. reported `free_cash_flow_growth` (YoY)
- Revenue growth trajectory
- Analyst implied EPS growth

**Growth rate selection:**
- Stable FCF history → CAGR with 10-20% haircut (use `calculator` → `multiply`)
- Volatile FCF → Weight analyst estimates more heavily
- **Hard cap at 15%** — sustained higher growth is historically rare
- Negative FCF → This model may not be appropriate. Say so.

---

## Step 3: Determine Discount Rate (WACC)

Read [sector-wacc.md](../shared/sector-wacc.md) to get the sector base range.

**Compute WACC with `calculator`:**
```
calculator({
  operation: "wacc",
  values: [cost_of_equity, after_tax_cost_of_debt],
  weights: [equity_weight, debt_weight]
})
```

Where:
- Equity weight and debt weight derived from `debt_to_equity` (use `calculator`)
- Cost of equity: risk-free rate (4%) + beta × equity risk premium (5-6%)
- Cost of debt: 5-6% pre-tax → use `calculator` with `multiply([pretax_rate, 1 - tax_rate])`

**Validation:** WACC should be 2-4% below `return_on_invested_capital` for value-creating companies. If WACC > ROIC, flag that the company may be destroying value.

Apply adjustment factors from [sector-wacc.md](../shared/sector-wacc.md).

---

## Step 4: Project Cash Flows and Terminal Value

**All projections must use `calculator`. No mental math.**

**Years 1-5:** Apply growth rate with annual competitive decay:
```
Year 1: calculator({ operation: "multiply", values: [base_fcf, 1 + growth_rate], label: "FCF Year 1" })
Year 2: calculator({ operation: "multiply", values: [fcf_y1, 1 + growth_rate * 0.95], label: "FCF Year 2" })
Year 3: ... growth_rate * 0.90
Year 4: ... growth_rate * 0.85
Year 5: ... growth_rate * 0.80
```

**Terminal value** (Gordon Growth Model):
```
calculator({
  operation: "expression",
  expression: "fcf_y5 * (1 + 0.025) / (wacc - 0.025)",
  label: "Terminal Value"
})
```
Use 2.5% terminal growth as GDP proxy. Never exceed 3%.

---

## Step 5: Derive Intrinsic Value Per Share

**Discount each cash flow using `calculator`:**
```
For each year i (1-5):
  calculator({ operation: "pv", values: [fcf_yi], rate: wacc, periods: i })

Terminal PV:
  calculator({ operation: "pv", values: [terminal_value], rate: wacc, periods: 5 })
```

**Sum all present values:**
```
calculator({ operation: "sum", values: [pv_y1, pv_y2, ..., pv_terminal], label: "Enterprise Value" })
```

**Equity value:**
```
calculator({ operation: "expression", expression: "ev - total_debt + cash + investments", label: "Equity Value" })
```

**Fair value per share:**
```
calculator({ operation: "divide", values: [equity_value, shares_outstanding], label: "Fair Value / Share" })
```

**Margin of safety:**
```
calculator({ operation: "percent_change", values: [current_price, fair_value], label: "Upside/Downside %" })
```

---

## Step 6: Stress-Test via Sensitivity Analysis

Build a 3x3 matrix varying two assumptions simultaneously:
- WACC: base -1%, base, base +1%
- Terminal growth: 2.0%, 2.5%, 3.0%

That's 9 scenarios. Run each through `calculator`. Present as a table.

The range matters more than the point estimate. If all 9 scenarios show upside, that's meaningful. If half show downside, say so.

---

## Step 7: Validate Against Reality

Before presenting, run these sanity checks (all via `calculator`):

1. **EV comparison:** `calculator({ operation: "percent_change", values: [reported_ev, calculated_ev] })`
   - Should be within ±30%. If not, revisit assumptions.

2. **Terminal value ratio:** `calculator({ operation: "divide", values: [pv_terminal, total_ev] })`
   - Should be 50-80% for mature companies
   - \>90% → growth assumptions likely too aggressive
   - <40% → near-term projections may be too optimistic

3. **FCF yield cross-check:** `calculator({ operation: "divide", values: [latest_fcf, calculated_ev] })`
   - Compare to sector peers. If wildly different, investigate why.

4. **Per-share sanity:** Fair value should be within a reasonable band of `free_cash_flow_per_share × 15-25`

If validation fails, **revise assumptions before presenting**. A wrong answer presented confidently is worse than no answer.

---

## Step 8: Present with Intellectual Honesty

Structure the output:

1. **Valuation Summary** — Current price vs fair value, upside/downside %, one-sentence verdict
2. **Key Assumptions Table** — Every input with its source (tool result, sector table, assumption)
3. **Projected FCF Table** — 5-year projections with growth rates and present values
4. **Sensitivity Matrix** — 3x3 grid, highlight where current price falls
5. **What Could Go Wrong** — Not generic disclaimers. Specific risks to *this* company that would break *these* assumptions
6. **Confidence Assessment** — How much do you trust this model for this company? High-quality for stable FCF generators. Low-quality for pre-profit or turnaround situations. Say which.

> *"It is better to be approximately right than precisely wrong."* — Buffett, channeling Keynes.
> But with `calculator`, we can be precisely right about the arithmetic and honestly approximate about the assumptions.
