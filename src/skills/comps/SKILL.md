---
name: comps
description: >
  Comparable company (relative valuation) analysis. Compares a company against its
  peers on valuation multiples, growth, profitability, and quality metrics. Triggers
  when user asks "how does X compare to peers", "is X cheap relative to", comparable
  analysis, peer comparison, relative valuation, "X vs Y vs Z", sector comparison, or
  wants to know if a valuation is justified by fundamentals relative to the peer group.
---

# Comparable Company Analysis

> *"You can't value a house by looking at it alone. You need to see what the neighbors sold for."*

Relative valuation answers a different question than DCF. DCF asks: *what is this business
worth in absolute terms?* Comps ask: *is the market pricing this business fairly relative
to similar businesses?* Both answers matter. A stock can be intrinsically cheap but
relatively expensive, or vice versa. The tension between the two is often where the
insight lives.

Aswath Damodaran taught us that multiples are not shortcuts — they are compressed DCFs.
A P/E ratio embeds assumptions about growth, risk, and payout. Comparing multiples without
understanding what drives them is numerology, not analysis. Two companies with the same P/E
but different growth rates are not equally valued — one is cheap and the other is expensive.

The craft is in selecting the right peers, the right metrics, and then explaining
*why* the differences exist rather than simply noting that they do.

---

## Workflow

```
Comps Progress:
- [ ] Step 1: Define the peer group
- [ ] Step 2: Gather metrics for all companies
- [ ] Step 3: Build the comp table
- [ ] Step 4: Normalize and contextualize
- [ ] Step 5: Derive relative valuation
- [ ] Step 6: Present with context
```

---

## Step 1: Define the Peer Group

**Get the subject company's identity:**
```
get_financials: "[TICKER] company facts"
```
Extract: sector, industry, market cap, revenue scale.

**Find peers** — use one or both methods:

1. **Screen for peers:**
   ```
   stock_screener: "[Industry] companies with market cap between [0.3x] and [3x] of [TICKER]"
   ```

2. **User-provided peers** — if the user specifies, use those. The user may know their
   competitive landscape better than any screener.

**Peer group rules:**
- 4-8 peers is the sweet spot. Fewer = noisy. More = diluted.
- Same industry > same sector > adjacent sector
- Similar scale (market cap within 0.3x-3x) unless comparing intentionally
- Same geography preference, but global peers acceptable for large caps

---

## Step 2: Gather Metrics for All Companies

For the subject AND each peer, fetch:

```
get_financials: "[TICKER1] [TICKER2] [TICKER3] ... financial metrics snapshot"
get_financials: "[TICKER1] [TICKER2] [TICKER3] ... key ratios"
```

**Required metrics:**
| Category | Metrics |
|---|---|
| Valuation | P/E (fwd), EV/EBITDA, EV/Revenue, P/FCF, PEG |
| Growth | Revenue growth (YoY), EPS growth, FCF growth |
| Profitability | Gross margin, operating margin, net margin, ROE, ROIC |
| Quality | FCF conversion, debt/equity, interest coverage |
| Scale | Market cap, enterprise value, revenue |

---

## Step 3: Build the Comp Table

Use `calculator` for any derived metrics (PEG, EV/FCF, etc.).

**Primary table** (sorted by EV/EBITDA):

| Company | Mkt Cap | EV/EBITDA | P/E (fwd) | EV/Rev | Rev Growth | OM | ROIC |
|---|---|---|---|---|---|---|---|

**Use `calculator` for peer medians and means:**
```
calculator({ operation: "median", values: [peer1_ev_ebitda, peer2_ev_ebitda, ...], label: "Peer median EV/EBITDA" })
calculator({ operation: "mean", values: [peer1_ev_ebitda, peer2_ev_ebitda, ...], label: "Peer mean EV/EBITDA" })
```

**Compute premium/discount for subject vs peer median:**
```
calculator({ operation: "percent_change", values: [peer_median, subject_multiple], label: "[TICKER] premium/discount to peers" })
```

---

## Step 4: Normalize and Contextualize

Raw multiples lie. A company trading at 30x earnings with 40% growth is cheaper than
one at 15x with 5% growth. Normalize:

**PEG ratio** (growth-adjusted P/E):
```
calculator({ operation: "divide", values: [pe_ratio, eps_growth_rate], label: "[TICKER] PEG" })
```

**EV/EBITDA per unit of growth:**
```
calculator({ operation: "divide", values: [ev_ebitda, revenue_growth], label: "[TICKER] growth-adjusted EV/EBITDA" })
```

**Quality-adjusted assessment:**
- Higher margins justify higher multiples (pricing power, moat)
- Higher ROIC justifies higher multiples (capital efficiency)
- Lower leverage justifies higher multiples (less risk)
- If subject has premium multiple AND superior quality → premium may be justified
- If premium multiple WITHOUT superior quality → potentially overvalued

---

## Step 5: Derive Relative Valuation

**Implied value from peer multiples** — use `calculator` for each:

```
EV/EBITDA-implied:
  calculator({ operation: "multiply", values: [peer_median_ev_ebitda, subject_ebitda], label: "Implied EV (EV/EBITDA)" })
  → subtract net debt → divide by shares → implied price

P/E-implied:
  calculator({ operation: "multiply", values: [peer_median_pe, subject_eps], label: "Implied price (P/E)" })

EV/Revenue-implied:
  calculator({ operation: "multiply", values: [peer_median_ev_rev, subject_revenue], label: "Implied EV (EV/Rev)" })
```

**Range of implied values:**
```
calculator({ operation: "min", values: [implied_pe, implied_ev_ebitda, implied_ev_rev], label: "Low implied" })
calculator({ operation: "max", values: [implied_pe, implied_ev_ebitda, implied_ev_rev], label: "High implied" })
calculator({ operation: "mean", values: [implied_pe, implied_ev_ebitda, implied_ev_rev], label: "Blended implied" })
```

---

## Step 6: Present with Context

Use the **Analysis** and **Signal** output types from [output-types.md](../shared/output-types.md).

**Comp table** — the full peer comparison matrix
**Implied valuation range** — low, mid, high from different multiples
**Premium/discount summary** — where the subject sits vs peers and why

**Key question to answer:** Is the premium (or discount) *justified* by differences in
growth, quality, and risk? If yes, the stock is fairly valued on a relative basis. If
the premium exceeds what the fundamentals justify, it's relatively expensive. If the
discount is deeper than the fundamentals warrant, it's relatively cheap.

State which it is and why. Do not hide behind "it depends."

---

> *"Price is what you pay. Value is what you get. But 'what you get' only makes sense
> in context — and context means knowing what else you could get for the same price."*
