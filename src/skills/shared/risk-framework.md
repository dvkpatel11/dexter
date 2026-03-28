# Risk Framework

> *"Rule No. 1: Never lose money. Rule No. 2: Never forget Rule No. 1."* — Buffett

Position sizing is where philosophy meets arithmetic. Conviction without sizing
discipline is just storytelling. This framework translates thesis strength into
position parameters.

---

## Position Sizing

### By Conviction Level

| Conviction | Max Position Size | Max Portfolio Risk | Notes |
|---|---|---|---|
| High | 8-12% | 2-3% | Deep understanding, clear catalyst, margin of safety |
| Medium | 4-7% | 1-2% | Good thesis but uncertainty in timing or magnitude |
| Low | 1-3% | 0.5-1% | Speculative, early thesis, limited data |

**Portfolio risk** = position size × max drawdown estimate.
Example: 10% position with 25% stop = 2.5% portfolio risk.

### Hard Limits

- No single position > 15% of portfolio (unless explicitly approved by user)
- No single sector > 30% of portfolio
- Total portfolio risk (sum of all position risks) should not exceed 15-20%
- Cash reserve: maintain at least 5% for opportunistic deployment

---

## Stop Loss Framework

### By Instrument Type

| Instrument | Typical Stop | Method |
|---|---|---|
| Large cap equity | 10-15% | Below key support or trailing |
| Small/mid cap | 15-25% | Wider due to volatility |
| Options | 50% of premium | Time decay makes tighter stops harmful |
| Commodity ETF | 10-15% | Trend-following stops |

### By Strategy Type

| Strategy | Stop Logic |
|---|---|
| Value (DCF-driven) | Thesis invalidation, not price. If fundamentals unchanged, drawdown may be opportunity |
| Momentum/Technical | Price-based. Break of trend = exit |
| Event-driven | Event outcome. Binary — right or wrong |
| Income/Yield | Dividend cut or credit deterioration |

---

## Risk Metrics to Track

Use `calculator` for all computations.

| Metric | Formula | Threshold |
|---|---|---|
| Position risk | `position_size × stop_distance` | < 3% of portfolio |
| Portfolio heat | `sum(all position risks)` | < 20% |
| Concentration (HHI) | `sum(weight_i²)` | < 0.15 preferred |
| Win rate required | `1 / (1 + reward/risk)` | Must be achievable |
| Kelly fraction | `(win_rate × avg_win - loss_rate × avg_loss) / avg_win` | Use half-Kelly max |

---

## Correlation Awareness

Positions that appear diversified but share underlying risk factors are
false diversification. Common traps:

- Multiple tech stocks (all rate-sensitive)
- Energy + commodity equity (same macro driver)
- Multiple high-yield positions (all credit-sensitive)
- Emerging market equity + EM bonds (same risk-off vulnerability)

When assessing portfolio risk, group correlated positions and treat
them as a single larger exposure.
