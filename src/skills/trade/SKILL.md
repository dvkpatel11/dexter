---
name: trade
description: >
  Single trade proposal and execution. Takes a thesis or signal, sizes the position
  against the portfolio, and produces a fully specified order ready for execution.
  Triggers when user says "buy", "sell", "enter a position", "take a position",
  "I want to trade", "execute", "place an order", "how much should I buy",
  position sizing, or wants to act on a specific investment idea.
---

# Trade Execution

> *"The goal of a successful trader is to make the best trades. Money is secondary."*
> — Alexander Elder

A trade is not a signal. A signal says "I believe X will go up." A trade says "I will
buy Y shares of X at this price, exit at that price, and accept Z dollars of risk."
The distance between signal and trade is where most investors fail — they know what
they like but not how much to buy, when to get out, or how much they can afford to lose.

This skill bridges that gap. It takes a directional view (from any source — your own
conviction, a DCF, a technical setup, a tip from your uncle) and translates it into
a properly sized, risk-defined order with clear entry, exit, and invalidation criteria.

Ed Thorp taught us that even with an edge, improper sizing destroys returns. The Kelly
criterion tells you the mathematically optimal bet size — and practitioners use half-Kelly
because the real world has fatter tails than your model assumes. We size conservatively
because the goal is to stay in the game long enough for the edge to compound.

---

## Workflow

```
Trade Execution Progress:
- [ ] Step 1: Clarify the trade thesis
- [ ] Step 2: Fetch current data
- [ ] Step 3: Check portfolio context
- [ ] Step 4: Size the position
- [ ] Step 5: Define entry, exit, and stop
- [ ] Step 6: Compute risk metrics
- [ ] Step 7: Select account and order type
- [ ] Step 8: Present trade proposal
```

---

## Step 1: Clarify the Trade Thesis

Every trade needs answers to:

| Question | Must Have |
|---|---|
| What instrument? | Ticker or contract specification |
| Long or short? | Direction (short = sell existing position) |
| Why? | Signal, analysis, or user conviction |
| How long? | Time horizon (drives order type and stop width) |
| How much can you lose? | Max acceptable loss in dollars or % |

If any of these are missing, **ask the user** before proceeding. A trade without
a thesis is a gamble. We don't gamble.

If a Signal exists (from dcf, comps, technical, or x-research), reference it directly.
If the user has pure conviction with no analysis, note that — it's valid, but the
position size should reflect the lower confidence.

---

## Step 2: Fetch Current Data

```
get_market_data: "[TICKER] price snapshot"
get_financials: "[TICKER] financial metrics snapshot"
```

For options trades, also need:
```
get_market_data: "[TICKER] daily stock prices for the last 3 months"
```
(To compute historical volatility for pricing)

**Record the current price. This is the reference point for all calculations.**

---

## Step 3: Check Portfolio Context

Before sizing, understand the current portfolio state:

**Existing exposure:**
- Do we already own this ticker? How much?
- Do we have exposure to this sector? How concentrated?
- Would this trade create a correlated cluster?

**Available capital:**
- Cash available in the target account
- Buying power (including margin if applicable)
- Cash reserve requirement (maintain 5% minimum from [risk-framework.md](../shared/risk-framework.md))

```
calculator({ operation: "subtract", values: [total_cash, cash_reserve], label: "Deployable cash" })
```

**If adding to existing position:**
```
calculator({
  operation: "divide",
  values: [existing_value + new_trade_value, total_portfolio_value],
  label: "Post-trade position weight"
})
```
Flag if post-trade weight exceeds position limits from risk framework.

---

## Step 4: Size the Position

Read [risk-framework.md](../shared/risk-framework.md) for sizing rules.

### Method: Risk-Based Sizing (preferred)

Start from how much you can lose, work backwards to position size:

```
Max risk per trade (from risk framework):
  - High conviction: 2-3% of portfolio
  - Medium conviction: 1-2%
  - Low conviction: 0.5-1%

Stop distance:
  - From technical levels, ATR, or percentage-based

Position size = max_risk_dollars / stop_distance_per_share:
  calculator({
    operation: "divide",
    values: [max_risk_dollars, stop_distance],
    label: "Position size (shares)"
  })

Dollar amount:
  calculator({
    operation: "multiply",
    values: [position_shares, current_price],
    label: "Position value"
  })

Portfolio weight:
  calculator({
    operation: "divide",
    values: [position_value, total_portfolio_value],
    label: "Position weight %"
  })
```

### Method: Fixed Dollar Amount

If user specifies "$5,000 in AAPL":
```
calculator({
  operation: "divide",
  values: [5000, current_price],
  label: "Shares for $5,000"
})
Round DOWN to whole shares.
```

Then compute what risk this implies:
```
calculator({
  operation: "multiply",
  values: [shares, stop_distance],
  label: "Implied risk $"
})
calculator({
  operation: "divide",
  values: [implied_risk, total_portfolio_value],
  label: "Implied risk % of portfolio"
})
```
If implied risk exceeds framework limits, **warn the user** but don't block.

---

## Step 5: Define Entry, Exit, and Stop

### Entry
| Order Type | When to Use |
|---|---|
| Market | High urgency, liquid stock, small spread |
| Limit | Want specific price, less urgency, wider spread |
| Stop | Breakout entry (buy above resistance) |
| Stop-limit | Breakout with price protection |

**Default: limit order at or slightly below current price for buys.**
Avoid market orders unless the user explicitly wants immediate execution.

### Target
From the originating Signal/Analysis, or computed:
```
calculator({
  operation: "multiply",
  values: [current_price, 1 + expected_return],
  label: "Target price"
})
```

### Stop Loss
From technical levels (support), ATR-based, or percentage:
```
ATR-based stop (2x ATR below entry):
  calculator({ operation: "subtract", values: [entry_price, 2 * atr], label: "Stop price" })

Percentage stop:
  calculator({ operation: "multiply", values: [entry_price, 1 - stop_percent], label: "Stop price" })
```

---

## Step 6: Compute Risk Metrics

All via `calculator`. These numbers appear in the final proposal.

```
Max loss (dollars):
  calculator({ operation: "multiply", values: [shares, entry - stop], label: "Max loss $" })

Max loss (% of portfolio):
  calculator({ operation: "divide", values: [max_loss, portfolio_value], label: "Max loss % portfolio" })

Target gain (dollars):
  calculator({ operation: "multiply", values: [shares, target - entry], label: "Target gain $" })

Reward/Risk ratio:
  calculator({ operation: "divide", values: [target_gain, max_loss], label: "R:R ratio" })
```

**Gate check:**
- R:R must be ≥ 1.5:1 for medium conviction, ≥ 2:1 for low conviction
- High conviction can accept 1:1 if thesis is strong
- If R:R < 1:1, **reject the trade setup** — the math doesn't work

---

## Step 7: Select Account and Order Type

### Account Selection
| Instrument | Preferred Account | Rationale |
|---|---|---|
| Growth stocks | TFSA | Capital gains are tax-free |
| Dividend stocks | TFSA or RRSP | Depends on withholding tax (US dividends in RRSP avoid 15% withholding) |
| US dividend stocks | RRSP | Avoids 15% US withholding tax |
| Short-term trades | Personal | Don't waste TFSA room on speculation |
| Options | Margin (if multi-leg) | TFSA/RRSP limited to long calls/puts/covered calls |

### Execution Mode
```
if (instrument is stock or ETF AND account.tradingEnabled):
  executionMode = "auto"  // SnapTrade can execute
else:
  executionMode = "manual"  // User executes on WS directly
```

---

## Step 8: Present Trade Proposal

Use the **Strategy** output type from [output-types.md](../shared/output-types.md).

```
### Trade Proposal: [Action] [SYMBOL]

**Thesis:** [1-2 sentences — why this trade]
**Source:** [Signal ID / skill / user conviction]

**Order:**
| Field | Value |
|---|---|
| Symbol | [TICKER] |
| Action | Buy / Sell |
| Quantity | [X] shares |
| Order type | Limit |
| Limit price | $[X] |
| Time-in-force | Day / GTC |
| Account | [TFSA / RRSP / Personal] |
| Execution | Auto (SnapTrade) / Manual |

**Risk/Reward:**
| Metric | Value |
|---|---|
| Entry | $[X] |
| Target | $[X] (+[Y]%) |
| Stop | $[X] (-[Y]%) |
| Max loss | $[X] ([Y]% of portfolio) |
| Target gain | $[X] |
| R:R | [X]:1 |
| Position size | [Y]% of portfolio |

**Exit Rules:**
- Take profit at $[target] or [X]% gain
- Stop loss at $[stop] — exit immediately, no averaging down
- Time stop: [if applicable, e.g., "reassess if no movement in 30 days"]

**Dependencies:**
- [What must remain true]

[Approve] → Submit to SnapTrade (auto) or display manual instructions
[Modify] → Adjust parameters
[Reject] → Archive, no action
```

> *"Plan your trade, trade your plan."* — Every trading floor, every era.
>
> The proposal is the plan. Once approved, execute exactly as specified.
> If conditions change before execution, regenerate — don't improvise.
