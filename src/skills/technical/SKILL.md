---
name: technical
description: >
  Technical and price action analysis. Evaluates trend, momentum, support/resistance,
  and chart structure using historical price data. Triggers when user asks about
  "chart", "technical analysis", "support/resistance", "trend", "momentum", "moving
  average", "breakout", "price action", "overbought/oversold", entry/exit timing,
  or wants to know if now is a good time to buy/sell based on price behavior.
---

# Technical Analysis

> *"The tape tells the truth."* — Jesse Livermore

Technical analysis is not fortune-telling. It is the study of supply and demand made
visible through price and volume. Every tick represents a real transaction between a
buyer and a seller who disagreed on value. The aggregate of those disagreements creates
structure — trends, levels, patterns — that reflect the psychology of the market's
participants.

William O'Neil taught us that great stocks share common technical characteristics before
their biggest moves. Stan Weinstein showed us that stage analysis — understanding where
an asset sits in its lifecycle — is more important than any single indicator. Mark
Minervini demonstrated that risk management through price structure is what separates
professionals from gamblers.

We do not predict. We observe structure, define risk levels, and size accordingly.
A support level is not a guarantee — it is a line where our thesis is invalidated
if broken. That distinction is everything.

**Important:** This skill uses historical price data from `get_market_data`. We compute
indicators via `calculator`, not pattern-match from memory. Every level cited must trace
to actual price data.

---

## Workflow

```
Technical Analysis Progress:
- [ ] Step 1: Fetch price history (multiple timeframes)
- [ ] Step 2: Identify trend and stage
- [ ] Step 3: Calculate key indicators
- [ ] Step 4: Map support and resistance
- [ ] Step 5: Assess momentum and volume
- [ ] Step 6: Define risk/reward levels
- [ ] Step 7: Synthesize signal
```

---

## Step 1: Fetch Price History

Request multiple timeframes for context:

```
get_market_data: "[TICKER] daily stock prices for the last 1 year"
get_market_data: "[TICKER] weekly stock prices for the last 3 years"
```

Extract: `close`, `high`, `low`, `open`, `volume`, `date` arrays.

Also fetch current snapshot:
```
get_market_data: "[TICKER] price snapshot"
```

---

## Step 2: Identify Trend and Stage

### Weinstein Stage Analysis

Using the weekly data, classify the current stage:

| Stage | Characteristics | Implication |
|---|---|---|
| 1 — Basing | Price consolidating after decline, flat moving averages | Accumulation, watch for breakout |
| 2 — Advancing | Price above rising moving averages, higher highs/lows | Uptrend, favorable for longs |
| 3 — Topping | Price volatile around flattening averages, fails to make new highs | Distribution, reduce exposure |
| 4 — Declining | Price below falling moving averages, lower highs/lows | Downtrend, avoid or short |

### Trend Direction

Use `calculator` to compute:

**50-day SMA:**
```
calculator({ operation: "mean", values: [last_50_closes], label: "50-day SMA" })
```

**200-day SMA:**
```
calculator({ operation: "mean", values: [last_200_closes], label: "200-day SMA" })
```

**Trend classification:**
- Price > 50 SMA > 200 SMA → Strong uptrend
- Price > 200 SMA, below 50 SMA → Pullback in uptrend
- Price < 50 SMA < 200 SMA → Strong downtrend
- 50 SMA crossing above 200 SMA → Golden cross (bullish)
- 50 SMA crossing below 200 SMA → Death cross (bearish)

---

## Step 3: Calculate Key Indicators

All via `calculator`. No mental math.

### RSI (14-period)
1. Separate daily price changes into gains and losses
2. Average gain and loss over 14 periods:
```
calculator({ operation: "mean", values: [gains_14], label: "Avg gain" })
calculator({ operation: "mean", values: [losses_14], label: "Avg loss" })
calculator({ operation: "divide", values: [avg_gain, avg_loss], label: "RS" })
calculator({ operation: "expression", expression: "100 - (100 / (1 + RS))", label: "RSI" })
```

Interpret:
- RSI > 70 → Overbought (not a sell signal alone — can stay overbought in strong trends)
- RSI < 30 → Oversold
- RSI divergence from price → Potential trend reversal

### ATR (14-period Average True Range)
For each day, true range = max(high-low, |high-prev_close|, |low-prev_close|)
```
calculator({ operation: "mean", values: [true_ranges_14], label: "ATR(14)" })
```
Used for stop placement and volatility assessment.

### Price vs. Moving Averages
```
calculator({ operation: "percent_change", values: [sma_200, current_price], label: "% above/below 200 SMA" })
calculator({ operation: "percent_change", values: [sma_50, current_price], label: "% above/below 50 SMA" })
```

---

## Step 4: Map Support and Resistance

Identify key levels from price history:

### Method: Swing Highs/Lows
Scan the daily data for:
- **Support:** Recent swing lows where price bounced (multiple touches = stronger)
- **Resistance:** Recent swing highs where price reversed

### Method: Volume-Weighted Levels
Levels where significant volume transacted represent areas of memory — many participants
have positions there and will act when price revisits.

### Method: Round Numbers and Prior Gaps
- Round psychological levels ($100, $200, $50, etc.)
- Unfilled gaps from earnings or news events

Present as a table:
| Level | Type | Strength | Last Tested | Notes |
|---|---|---|---|---|

---

## Step 5: Assess Momentum and Volume

### Volume Analysis
```
calculator({ operation: "mean", values: [last_20_volumes], label: "20-day avg volume" })
calculator({ operation: "divide", values: [latest_volume, avg_volume_20], label: "Relative volume" })
```

- Relative volume > 1.5 on up days → Institutional accumulation
- Relative volume > 1.5 on down days → Institutional distribution
- Declining volume during pullback → Healthy, low conviction selling

### Momentum Assessment
- Price making higher highs with RSI making higher highs → Confirmed momentum
- Price making higher highs with RSI making lower highs → Bearish divergence (warning)
- Price making lower lows with RSI making higher lows → Bullish divergence (potential reversal)

---

## Step 6: Define Risk/Reward Levels

**Every technical signal must have defined levels.** Use `calculator` for all.

### Stop Loss
```
calculator({ operation: "multiply", values: [atr, 2], label: "2x ATR stop distance" })
calculator({ operation: "subtract", values: [current_price, atr_stop], label: "Stop price (ATR-based)" })
```

Alternative: place stop below nearest support level.

### Target
Nearest resistance level, or measured move based on pattern.

### Risk/Reward
```
calculator({ operation: "subtract", values: [target, current_price], label: "Potential gain" })
calculator({ operation: "subtract", values: [current_price, stop], label: "Potential loss" })
calculator({ operation: "divide", values: [potential_gain, potential_loss], label: "R:R ratio" })
```

**Minimum R:R of 2:1 for any technical trade.** If the structure doesn't offer 2:1,
the setup is not actionable — say so.

---

## Step 7: Synthesize Signal

Use the **Signal** output type from [output-types.md](../shared/output-types.md).

Include:
1. **Stage & Trend** — where does this sit in its lifecycle?
2. **Key Levels Table** — support, resistance, stop, target
3. **Indicator Summary** — RSI, moving averages, volume, momentum
4. **Signal** — direction, conviction, timeframe
5. **Invalidation** — the specific price level that kills the thesis
6. **Context** — how does the technical picture align with (or diverge from) fundamentals?

> *"In trading, it's not about being right. It's about how much you make when you're
> right versus how much you lose when you're wrong."* — Minervini
>
> The chart doesn't tell you what will happen. It tells you where you're wrong.
> Define that level before you enter, and the rest is arithmetic.
