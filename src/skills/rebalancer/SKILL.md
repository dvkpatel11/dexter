---
name: rebalancer
description: >
  Portfolio rebalancing — compares current allocation against target model and
  generates the exact trades needed to realign. Triggers when user asks to
  rebalance, "fix my allocation", "drift check", "get back to target", "too
  much in X", "underweight Y", or wants to realign holdings with their
  investment plan.
---

# Portfolio Rebalancer

> *"Rebalancing is the disciplined act of selling what has worked to buy what
> hasn't — the opposite of what feels good, and exactly what the math demands."*

Rebalancing is not trading. It is maintenance. A portfolio drifts because winners grow
and losers shrink — which means left alone, a portfolio concentrates in whatever has
performed best recently. That is recency bias expressed as asset allocation, and it is
the silent risk that most investors ignore until a drawdown teaches them otherwise.

The discipline comes from having a target, measuring drift, and acting when the gap
is wide enough to matter but not so narrow that you're churning for no benefit. The
tolerance band is the art — too tight and you trade constantly (fees, taxes, slippage),
too loose and you're not rebalancing at all.

---

## Workflow

```
Rebalancer Progress:
- [ ] Step 1: Load current portfolio state
- [ ] Step 2: Load or define target allocation
- [ ] Step 3: Calculate drift
- [ ] Step 4: Generate rebalance trades
- [ ] Step 5: Validate and optimize
- [ ] Step 6: Present trade plan
```

---

## Step 1: Load Current Portfolio State

Fetch all positions and balances. In production this comes from SnapTrade; during
analysis, the user provides holdings or we read from memory.

For each position, establish:
- Symbol, quantity, current price, market value
- Asset class classification (stock, ETF, fixed income, cash)
- Sector (for equity positions)
- Account (TFSA, RRSP, Personal — matters for tax-aware rebalancing)

Compute total portfolio value:
```
calculator({ operation: "sum", values: [all_position_values, cash], label: "Total portfolio value" })
```

Compute current weights:
```
For each position:
  calculator({ operation: "divide", values: [position_value, total_value], label: "[SYMBOL] current weight" })
```

---

## Step 2: Load or Define Target Allocation

The user should have an AllocationTarget defined. If not, help them create one based
on their Objectives (read from memory or ask).

**Common models by objective:**

| Objective | Equities | Fixed Income | Cash | Alternatives |
|---|---|---|---|---|
| Aggressive growth | 80-90% | 5-10% | 5% | 0-5% |
| Balanced growth | 60-70% | 20-30% | 5-10% | 0-5% |
| Income focused | 40-50% | 40-50% | 5-10% | 0-5% |
| Capital preservation | 20-30% | 50-60% | 10-20% | 0-5% |

**Target can be defined at multiple levels:**
- Asset class level: 60% equity, 30% fixed income, 10% cash
- Sector level: max 25% in any single sector
- Ticker level: specific holdings with target weights
- Hybrid: asset class targets with sector constraints

---

## Step 3: Calculate Drift

For each allocation slice, compute drift using `calculator`:

```
calculator({
  operation: "subtract",
  values: [current_weight, target_weight],
  label: "[LABEL] drift"
})
```

**Drift assessment:**

| Drift | Action |
|---|---|
| Within tolerance (e.g., ±2%) | No action needed |
| Outside tolerance, small | Rebalance with new cash flow if possible |
| Outside tolerance, large (>5%) | Active rebalance — generate trades |

**Flag the biggest drifts first.** Rebalancing is prioritized by magnitude of drift,
not alphabetical order.

---

## Step 4: Generate Rebalance Trades

For each position that needs adjustment:

```
Target value:
  calculator({ operation: "multiply", values: [target_weight, total_value], label: "[SYMBOL] target value" })

Delta value:
  calculator({ operation: "subtract", values: [target_value, current_value], label: "[SYMBOL] delta $" })

Delta shares:
  calculator({ operation: "divide", values: [delta_value, current_price], label: "[SYMBOL] delta shares" })
  Round DOWN for buys, UP for sells (conservative)
```

**Produce a trade list:**

| Symbol | Action | Shares | Est. Value | Current Wt | Target Wt | New Wt |
|---|---|---|---|---|---|---|

**Cash flow rebalancing** (preferred when possible):
- If user is adding cash, direct it entirely to underweight positions
- Avoids selling (no tax events, no transaction costs)
- Calculate how much new cash each underweight position should receive

---

## Step 5: Validate and Optimize

### 5.1 Minimum Trade Threshold
Skip trades where |delta_value| < $50 (not worth the execution cost).

### 5.2 Account Optimization
If user has multiple accounts:
- Sell from taxable accounts where loss harvesting is possible
- Buy growth in TFSA (tax-free gains)
- Buy fixed income in RRSP (interest is fully taxable otherwise)
- Never trigger unnecessary taxable events

### 5.3 Cash Reserve
Ensure at least 5% cash remains after all trades (or user-specified minimum).
```
calculator({
  operation: "subtract",
  values: [current_cash, total_buy_amount],
  label: "Remaining cash after buys"
})
```

### 5.4 Sell-Before-Buy Sequencing
If the rebalance requires both sells and buys, sells must settle before buys
can use the proceeds. Note the settlement delay (T+1 for US equities on WS).

### 5.5 Sanity Check
```
After rebalance:
  For each position, verify new weight is within tolerance of target
  calculator({ operation: "subtract", values: [new_weight, target_weight], label: "[SYMBOL] residual drift" })
```

---

## Step 6: Present Trade Plan

Use the **Strategy** output type from [output-types.md](../shared/output-types.md)
with executionMode based on instrument type.

**Summary:**
| Metric | Value |
|---|---|
| Positions to adjust | X of Y |
| Total buys | $X across N positions |
| Total sells | $X across N positions |
| Net cash flow | +/- $X |
| Remaining cash | $X (Y%) |
| Estimated fees | $0 (Wealthsimple) |

**Trade list:**
| # | Symbol | Action | Shares | Price | Value | Account | Mode |
|---|---|---|---|---|---|---|---|
| 1 | XIC.TO | Buy | 15 | $33.50 | $502 | TFSA | auto |
| 2 | AAPL | Sell | 3 | $198 | $594 | Personal | auto |
| ... | | | | | | | |

**Before/After comparison:**
| Asset Class | Before | After | Target | Drift |
|---|---|---|---|---|
| Equity | 72% | 65% | 65% | 0% |
| Fixed Income | 18% | 25% | 25% | 0% |
| Cash | 10% | 10% | 10% | 0% |

Each trade in the list becomes a draft Order. User approves the batch, then
orders are submitted to SnapTrade sequentially (sells first, then buys).

> *"The purpose of rebalancing is not to maximize returns. It is to maintain the
> risk profile you chose when you were thinking clearly — not the one that market
> momentum has drifted you into."*
