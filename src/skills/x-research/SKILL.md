---
name: x-research
description: >
  X/Twitter public sentiment research. Searches X for real-time perspectives,
  market sentiment, expert opinions, breaking news, and community discourse.
  Use when: user asks "what are people saying about", "X/Twitter sentiment",
  "check X for", "search twitter for", "what's CT saying about", or wants
  public opinion on a stock, sector, company, or market event.
---

# X Research

> *"The stock market is a device for transferring money from the impatient to the patient."* — Buffett

The crowd is data, not direction. X is the modern trading floor — raw, unfiltered, and
full of noise. The skill is in separating signal from performance. A viral bearish thread
is not evidence of overvaluation any more than a bullish meme is evidence of a moat.

We study sentiment the way an anthropologist studies a tribe: with genuine curiosity,
healthy distance, and zero desire to join the dance. The goal is not to follow the crowd
or to be contrarian for its own sake — it is to understand what the crowd believes and
then independently assess whether that belief is priced in, mispriced, or irrelevant.

George Soros understood reflexivity — that market narratives change fundamentals and
fundamentals change narratives. X is where those narratives form in real time. We watch
the formation, not to follow it, but to understand the feedback loop.

---

## Research Loop

### 1. Decompose into Queries

Turn the research question into 3-5 targeted queries using X operators:

- **Core query**: Direct keywords or `$TICKER` cashtag
- **Expert voices**: `from:username` for known analysts or accounts
- **Bearish signal**: keywords like `(overvalued OR bubble OR risk OR concern)`
- **Bullish signal**: keywords like `(bullish OR upside OR catalyst OR beat)`
- **News/links**: add `has:links` to surface tweets with sources
- **Noise reduction**: `-is:reply` to focus on original posts; `-airdrop -giveaway` for crypto

### 2. Execute Searches

Use `x_search` with `command: "search"`. For each query:

- Start with `sort: "likes"` and `limit: 15` for highest-signal tweets
- Add `min_likes: 5` or higher to filter noise on broad topics
- Use `since: "1d"` or `"7d"` depending on time sensitivity
- If too noisy → narrow operators or raise `min_likes`
- If too few results → broaden with `OR` or remove restrictive operators

### 3. Check Key Accounts (Optional)

For known analysts, fund managers, or executives, use `command: "profile"` to see
recent posts directly.

### 4. Follow Threads (Optional)

High-engagement thread starters → use `command: "thread"` with tweet ID for full context.

### 5. Synthesize

Group by theme (bullish, bearish, neutral, catalysts). For each:

```
### [Theme]

[1-2 sentence summary]

- @username: "[key quote]" — [likes] [Tweet](url)
- @username2: "[perspective]" — [likes] [Tweet](url)
```

End with **Overall Sentiment**: predominant tone, confidence level, and divergence
between retail and institutional voices.

## Refinement Heuristics

| Problem | Fix |
|---|---|
| Too much noise | Raise `min_likes`, add `-is:reply`, narrow keywords |
| Too few results | Broaden with `OR`, remove restrictive operators |
| Crypto spam | Add `-airdrop -giveaway -whitelist` |
| Want expert takes only | Use `from:` or `min_likes: 50` |
| Want substance over hot takes | Add `has:links` |

## Output

1. **Query Summary** — what was searched and time window
2. **Sentiment Themes** — grouped findings with sourced quotes and tweet links
3. **Overall Sentiment** — tone, confidence, key voices
4. **Reflexivity Check** — is the narrative *driving* price action or *reacting to* it? This distinction matters.
5. **Caveats** — X sentiment is not predictive; sample bias toward vocal minorities; recency bias; bots exist
