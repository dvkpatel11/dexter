---
name: options
description: >
  Options analysis and strategy selection. Evaluates volatility, computes greeks,
  prices contracts, and recommends strategies based on outlook and objectives.
  Triggers when user asks about options, calls, puts, spreads, iron condors,
  straddles, covered calls, "sell premium", implied volatility, greeks, theta
  decay, options income, hedging with options, or any derivatives strategy.
---

# Options Analysis

> *"Options are not about predicting the future. They are about pricing the
> uncertainty of the future — and finding spots where the market prices that
> uncertainty wrong."* — Nassim Taleb (paraphrased)

Options are contracts on conviction. Every option position embeds a bet on direction,
magnitude, timing, and volatility — four dimensions where equities have one. This
complexity is not a bug. It is the source of edge for those who understand it and the
source of ruin for those who don't.

Myron Scholes and Fischer Black gave us the pricing framework. But Black-Scholes is a
map, not the territory. It assumes constant volatility and log-normal distributions —
assumptions the market violates every day. The volatility smile exists because the market
knows what the model doesn't: tails are fatter than Gaussian, and crashes cluster.

We use the framework as a starting point, then adjust for reality. Implied volatility
is not a forecast — it is a price. When IV is high, options are expensive. When IV is
low, they are cheap. The question is always: *is the market pricing in too much or too
little uncertainty relative to what I believe will happen?*

**Execution note:** Wealthsimple supports options on US stocks/ETFs (NYSE, NASDAQ).
Registered accounts (TFSA, RRSP) allow long calls, long puts, and covered calls only.
Margin accounts unlock multi-leg strategies. All strategies in this skill respect these
constraints.

---

## Workflow

```
Options Analysis Progress:
- [ ] Step 1: Define the thesis and objective
- [ ] Step 2: Gather underlying and volatility data
- [ ] Step 3: Evaluate IV environment
- [ ] Step 4: Select strategy
- [ ] Step 5: Price and compute greeks
- [ ] Step 6: Model scenarios
- [ ] Step 7: Define risk parameters
- [ ] Step 8: Present strategy proposal
```

---

## Step 1: Define the Thesis and Objective

Before touching a single greek, clarify:

| Question | Why It Matters |
|---|---|
| **Direction?** | Long, short, or neutral? Determines strategy family |
| **Magnitude?** | Big move or small? Determines strike selection |
| **Timing?** | When? Determines expiry selection |
| **Objective?** | Income, hedge, or speculation? Determines risk profile |
| **Account type?** | TFSA/RRSP = limited strategies. Margin = full suite |

Map to strategy family:

| Outlook | Objective | Strategy Family |
|---|---|---|
| Bullish, high conviction | Leverage | Long call, bull call spread |
| Bullish, income | Premium collection | Covered call, cash-secured put |
| Bearish | Profit from decline | Long put, bear put spread |
| Neutral | Income / range-bound | Iron condor, iron butterfly, strangle |
| Hedge existing position | Protection | Protective put, collar |
| Uncertain but expect big move | Volatility | Straddle, strangle |

---

## Step 2: Gather Underlying and Volatility Data

```
get_market_data: "[TICKER] price snapshot"
get_market_data: "[TICKER] daily stock prices for the last 3 months"
get_financials: "[TICKER] financial metrics snapshot"
```

**Compute historical volatility using `calculator`:**
```
1. Calculate daily log returns:
   For each day: calculator({ operation: "expression", expression: "ln(close_today / close_yesterday)" })

2. Standard deviation of returns:
   calculator({ operation: "stdev", values: [all_log_returns], label: "Daily vol" })

3. Annualize:
   calculator({ operation: "multiply", values: [daily_vol, sqrt(252)], label: "Historical volatility (annualized)" })
```

**Check for upcoming catalysts:**
```
get_market_data: "[TICKER] company news"
```
Earnings dates, FDA decisions, product launches — these inflate IV pre-event.

---

## Step 3: Evaluate IV Environment

Compare implied volatility (if available from data) to historical volatility:

```
calculator({ operation: "percent_change", values: [historical_vol, implied_vol], label: "IV premium/discount to HV" })
```

| IV vs HV | Interpretation | Favors |
|---|---|---|
| IV >> HV (>20% premium) | Options expensive | Selling premium |
| IV ≈ HV | Fairly priced | Directional trades |
| IV << HV (>20% discount) | Options cheap | Buying options |

**IV Rank / Percentile context:**
- High IV rank → premium selling strategies (covered calls, iron condors)
- Low IV rank → premium buying strategies (long calls/puts, debit spreads)

If precise IV data isn't available from tools, note the limitation and use historical
volatility as the baseline. Do not fabricate IV numbers.

---

## Step 4: Select Strategy

Based on Steps 1-3, select a specific strategy. Reference the account type constraint:

### TFSA/RRSP Compatible (registered accounts)
| Strategy | When | Max Risk |
|---|---|---|
| Long call | Bullish, defined risk | Premium paid |
| Long put | Bearish, defined risk | Premium paid |
| Covered call | Own shares, want income | Opportunity cost above strike |

### Margin Account (full suite)
| Strategy | When | Max Risk |
|---|---|---|
| Bull call spread | Bullish, lower cost than naked call | Spread width - premium |
| Bear put spread | Bearish, lower cost than naked put | Spread width - premium |
| Cash-secured put | Bullish, willing to own at strike | Strike price × 100 |
| Iron condor | Neutral, range-bound, high IV | Spread width - premium |
| Iron butterfly | Neutral, pinned at price, high IV | Spread width - premium |
| Straddle | Expect big move, unsure of direction | Premium paid (both legs) |
| Collar | Hedge existing long, cap upside | Capped gains |

---

## Step 5: Price and Compute Greeks

**All calculations via `calculator`.** For each leg:

### Black-Scholes (European approximation)
```
d1:
  calculator({
    operation: "expression",
    expression: "(ln(S/K) + (r + v^2/2) * T) / (v * sqrt(T))",
    label: "d1"
  })

d2:
  calculator({ operation: "expression", expression: "d1 - v * sqrt(T)", label: "d2" })
```
Where S = spot, K = strike, r = risk-free rate, v = volatility, T = time to expiry in years.

### Greeks (approximate)
| Greek | What It Measures | Use |
|---|---|---|
| **Delta** | Price sensitivity to $1 move in underlying | Position sizing, hedge ratio |
| **Gamma** | Rate of delta change | Risk of large moves |
| **Theta** | Daily time decay | Income from selling, cost of buying |
| **Vega** | Sensitivity to 1% IV change | Volatility exposure |

For multi-leg strategies, compute **net greeks** by summing across legs:
```
calculator({ operation: "sum", values: [leg1_delta, leg2_delta], label: "Net delta" })
calculator({ operation: "sum", values: [leg1_theta, leg2_theta], label: "Net theta" })
```

---

## Step 6: Model Scenarios

Build a P&L table at expiry for 5-7 underlying prices:

```
For each price point:
  calculator({
    operation: "expression",
    expression: "max(underlying - strike, 0) * quantity - premium_paid",
    label: "P&L at $[price]"
  })
```

| Underlying at Expiry | Leg 1 P&L | Leg 2 P&L | Total P&L | Return % |
|---|---|---|---|---|

Key price points to model:
- Current price
- Breakeven(s)
- Strike(s)
- ±1 standard deviation move
- Max profit price
- Max loss price

---

## Step 7: Define Risk Parameters

Using `calculator` for all:

```
Max loss:
  calculator({ operation: "...", label: "Maximum loss" })

Max profit:
  calculator({ operation: "...", label: "Maximum profit" })

Breakeven:
  calculator({ operation: "add", values: [strike, premium], label: "Breakeven (call)" })
  OR
  calculator({ operation: "subtract", values: [strike, premium], label: "Breakeven (put)" })

Probability approximation (using delta as rough proxy):
  Long call: delta ≈ probability of finishing ITM
  Credit spread: 1 - (spread_delta) ≈ probability of keeping premium
```

**Position sizing from [risk-framework.md](../shared/risk-framework.md):**
- Max loss on any options position ≤ 2% of portfolio
- Use 50% of premium as stop for long options (time decay makes tighter stops counterproductive)

---

## Step 8: Present Strategy Proposal

Use **Strategy** output type from [output-types.md](../shared/output-types.md).

Include:

1. **Strategy name and structure** — e.g., "Bull Call Spread on AAPL, $190/$200, June expiry"
2. **Leg detail table:**
   | Leg | Action | Strike | Expiry | Type | Qty | Est. Premium |
   |---|---|---|---|---|---|---|
3. **Greeks summary** — net delta, theta, vega
4. **P&L scenarios table** — at expiry for key price points
5. **Max loss / max profit / breakeven**
6. **IV context** — are you buying expensive or cheap options?
7. **Account compatibility** — TFSA/RRSP or margin required?
8. **Execution mode** — auto (if SnapTrade supports) or manual
9. **Exit plan:**
   - Profit target: close at X% of max profit
   - Time stop: close at Y days before expiry (avoid gamma risk)
   - Loss stop: close if position loses X% of premium

> *"The options market is the only place where you can be right about direction,
> right about magnitude, and still lose money because you were wrong about timing."*
>
> Define all four dimensions before entering. If you can't, the trade isn't ready.
