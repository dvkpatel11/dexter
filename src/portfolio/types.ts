/**
 * Portfolio Domain Model
 *
 * Data flows in three layers:
 *
 *   SnapTrade (broker)  →  Dexter (analysis)  →  Frontend (dashboard)
 *        Accounts             Signals               Views
 *        Positions            Strategies             Cards
 *        Orders               Analyses               Tables
 *        Transactions         Alerts                 Charts
 *
 * SnapTrade types represent raw broker data.
 * Dexter types represent enriched, analyzed outputs.
 * Frontend consumes both via the API server.
 */

// ============================================================================
// BROKER LAYER — Raw data from SnapTrade
// ============================================================================

/**
 * A brokerage account connected via SnapTrade.
 * One user can have multiple accounts (TFSA, RRSP, Personal, etc.)
 */
export interface Account {
  id: string;
  /** SnapTrade brokerage authorization ID */
  brokerageAuthId: string;
  /** Display name (e.g., "TFSA - Wealthsimple") */
  name: string;
  /** Account type */
  type: AccountType;
  /** Account number at the brokerage */
  number: string;
  /** Whether trading is enabled (vs read-only) */
  tradingEnabled: boolean;
  /** Base currency */
  currency: Currency;
  /** Last sync timestamp (ISO 8601) */
  syncedAt: string;
  /** Connection status */
  status: 'active' | 'disabled' | 'broken';
}

export type AccountType =
  | 'personal'
  | 'tfsa'
  | 'rrsp'
  | 'resp'
  | 'fhsa'
  | 'rdsp'
  | 'margin'
  | 'other';

export type Currency = 'CAD' | 'USD';

/**
 * A single holding in an account.
 * Equities, ETFs, and options each have different shapes.
 */
export interface Position {
  /** Internal ID (account_id + symbol + optionSpec hash) */
  id: string;
  accountId: string;
  symbol: string;
  /** Human-readable name */
  name: string;
  /** Instrument classification */
  instrumentType: InstrumentType;
  /** Number of shares or contracts */
  quantity: number;
  /** Average cost basis per unit (in position currency) */
  averageCost: number;
  /** Current market price per unit */
  currentPrice: number;
  /** Total market value (quantity × currentPrice) */
  marketValue: number;
  /** Unrealized P&L in dollar terms */
  unrealizedPnl: number;
  /** Unrealized P&L as percentage */
  unrealizedPnlPercent: number;
  /** Position currency */
  currency: Currency;
  /** For options only */
  option?: OptionDetail;
  /** Last price update */
  priceUpdatedAt: string;
}

export type InstrumentType =
  | 'stock'
  | 'etf'
  | 'option'
  | 'fixed_income'
  | 'cash'
  | 'crypto'
  | 'other';

/**
 * Option-specific fields attached to a Position.
 */
export interface OptionDetail {
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  /** Underlying ticker */
  underlying: string;
  /** Contracts × 100 */
  multiplier: number;
}

/**
 * Account balance breakdown.
 */
export interface Balance {
  accountId: string;
  /** Total market value of all holdings + cash */
  totalValue: number;
  /** Available cash (buying power) */
  cash: number;
  /** Cash as percentage of total */
  cashPercent: number;
  /** Market value of non-cash holdings */
  marketValue: number;
  currency: Currency;
  /** Breakdown by currency if multi-currency account */
  currencyBalances?: { currency: Currency; cash: number; marketValue: number }[];
}

/**
 * A historical transaction from the brokerage.
 */
export interface Transaction {
  id: string;
  accountId: string;
  symbol: string;
  type: TransactionType;
  /** Buy or sell */
  side?: 'buy' | 'sell';
  quantity: number;
  price: number;
  /** Total dollar amount (quantity × price + fees) */
  amount: number;
  fees: number;
  currency: Currency;
  /** Settlement date */
  settledAt: string;
  /** Description from brokerage */
  description: string;
}

export type TransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'contribution'
  | 'withdrawal'
  | 'fee'
  | 'interest'
  | 'transfer'
  | 'option_assignment'
  | 'option_exercise'
  | 'option_expiry'
  | 'other';

// ============================================================================
// ORDER LAYER — Trade execution via SnapTrade
// ============================================================================

/**
 * An order to be submitted or already submitted to the brokerage.
 */
export interface Order {
  id: string;
  accountId: string;
  symbol: string;
  side: 'buy' | 'sell';
  /** For options */
  optionAction?: 'buy_to_open' | 'buy_to_close' | 'sell_to_open' | 'sell_to_close';
  orderType: OrderType;
  timeInForce: TimeInForce;
  quantity: number;
  /** Limit price (required for limit/stop-limit) */
  limitPrice?: number;
  /** Stop price (required for stop/stop-limit) */
  stopPrice?: number;
  status: OrderStatus;
  /** Filled quantity (may be partial) */
  filledQuantity: number;
  /** Average fill price */
  fillPrice?: number;
  /** The Strategy ID that generated this order (traceability) */
  strategyId?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type TimeInForce = 'day' | 'gtc' | 'fok';
export type OrderStatus =
  | 'draft'        // proposed by Dexter, not yet submitted
  | 'pending'      // submitted to SnapTrade, awaiting impact check
  | 'validated'    // impact check passed, ready to execute
  | 'submitted'    // sent to brokerage
  | 'partial'      // partially filled
  | 'filled'       // fully filled
  | 'cancelled'    // cancelled by user or system
  | 'rejected'     // rejected by brokerage
  | 'expired';     // time-in-force expired

/**
 * Pre-trade impact assessment from SnapTrade.
 * Returned by getOrderImpact before execution.
 */
export interface OrderImpact {
  orderId: string;
  /** SnapTrade trade ID (needed to confirm execution) */
  snapTradeId: string;
  /** Estimated total cost including fees */
  estimatedCost: number;
  /** Commission/fees */
  fees: number;
  /** Remaining buying power after trade */
  remainingBuyingPower: number;
  /** FX rate if cross-currency */
  fxRate?: number;
  /** Warnings from the brokerage */
  warnings: string[];
}

// ============================================================================
// ANALYSIS LAYER — Dexter-generated intelligence
// ============================================================================

/**
 * A directional view on a specific instrument.
 * Produced by research skills (dcf, comps, technical, x-research).
 */
export interface Signal {
  id: string;
  symbol: string;
  direction: 'long' | 'short' | 'neutral';
  conviction: 'high' | 'medium' | 'low';
  timeframe: 'days' | 'weeks' | 'months' | 'quarters';
  /** One-line thesis */
  thesis: string;
  /** What would invalidate this signal */
  invalidation: string;
  /** Upcoming event that could move the price */
  catalyst?: string;
  /** Which skill produced this signal */
  source: SkillSource;
  /** Key evidence points (from tool data) */
  evidence: string[];
  /** Target price if applicable */
  targetPrice?: number;
  /** Stop/invalidation price */
  stopPrice?: number;
  /** Whether this signal has been acted on */
  status: 'active' | 'acted' | 'invalidated' | 'expired';
  createdAt: string;
  expiresAt?: string;
}

export type SkillSource =
  | 'dcf-valuation'
  | 'comps'
  | 'technical'
  | 'options'
  | 'x-research'
  | 'portfolio-analysis'
  | 'manual';

/**
 * An actionable trade plan with defined entry, exit, and risk.
 * Links a Signal to one or more Orders.
 */
export interface Strategy {
  id: string;
  name: string;
  /** The signal(s) that justify this strategy */
  signalIds: string[];
  /** Overall direction */
  direction: 'long' | 'short' | 'hedge' | 'income';
  /** Individual legs of the strategy */
  legs: StrategyLeg[];
  /** Risk/reward metrics (all computed by calculator) */
  risk: RiskMetrics;
  /** Conditions that must hold for strategy to remain valid */
  dependencies: string[];
  /** Execution status */
  status: 'proposed' | 'approved' | 'partial' | 'executed' | 'closed' | 'cancelled';
  /** Whether SnapTrade can execute this or manual only */
  executionMode: 'auto' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export interface StrategyLeg {
  symbol: string;
  instrumentType: InstrumentType;
  side: 'buy' | 'sell';
  quantity: number;
  /** Entry mechanism */
  entryType: OrderType;
  entryPrice?: number;
  /** Target exit price */
  targetPrice: number;
  /** Stop loss price */
  stopPrice: number;
  /** For options legs */
  option?: OptionDetail;
  /** The order ID once submitted */
  orderId?: string;
  /** Account to execute in */
  accountId?: string;
}

export interface RiskMetrics {
  /** Maximum dollar loss if all stops hit */
  maxLoss: number;
  /** Max loss as percent of portfolio */
  maxLossPercent: number;
  /** Target dollar gain */
  targetGain: number;
  /** Target gain as percent */
  targetGainPercent: number;
  /** Reward to risk ratio */
  rewardRiskRatio: number;
  /** Position size as percent of portfolio */
  positionSizePercent: number;
}

/**
 * Deep research output from a skill workflow.
 */
export interface Analysis {
  id: string;
  /** What was analyzed */
  subject: string;
  type: AnalysisType;
  /** 2-3 sentence conclusion */
  summary: string;
  /** Skill that produced it */
  source: SkillSource;
  /** Structured findings */
  findings: string[];
  /** Confidence in the analysis */
  confidence: 'high' | 'medium' | 'low';
  confidenceRationale: string;
  /** Known limitations */
  limitations: string[];
  /** Full markdown body (tables, projections, etc.) */
  body: string;
  /** Signals generated from this analysis */
  signalIds: string[];
  createdAt: string;
}

export type AnalysisType =
  | 'valuation'
  | 'relative_value'
  | 'technical'
  | 'sentiment'
  | 'portfolio_review'
  | 'options_analysis';

/**
 * Something changed or needs attention.
 */
export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  /** Specific instrument or "portfolio" */
  subject: string;
  /** What changed */
  title: string;
  /** Why it matters */
  description: string;
  /** What to consider doing */
  suggestedAction?: string;
  /** Related signal or strategy */
  relatedSignalId?: string;
  relatedStrategyId?: string;
  /** Whether the user has seen/acknowledged this */
  acknowledged: boolean;
  createdAt: string;
}

// ============================================================================
// PORTFOLIO LAYER — Aggregated views
// ============================================================================

/**
 * Portfolio-level snapshot combining all accounts.
 */
export interface PortfolioSnapshot {
  /** All connected accounts */
  accounts: Account[];
  /** Total value across all accounts */
  totalValue: number;
  /** Total cash across all accounts */
  totalCash: number;
  cashPercent: number;
  /** All positions flattened (with account attribution) */
  positions: Position[];
  /** Allocation breakdown */
  allocation: AllocationBreakdown;
  /** Risk metrics */
  risk: PortfolioRisk;
  /** As-of timestamp */
  snapshotAt: string;
}

export interface AllocationBreakdown {
  /** By asset class */
  byAssetClass: AllocationSlice[];
  /** By sector (equities only) */
  bySector: AllocationSlice[];
  /** By account */
  byAccount: AllocationSlice[];
  /** By currency */
  byCurrency: AllocationSlice[];
}

export interface AllocationSlice {
  label: string;
  marketValue: number;
  weight: number;
  /** Target weight if user has set allocation targets */
  targetWeight?: number;
  /** Difference from target */
  delta?: number;
}

export interface PortfolioRisk {
  /** Herfindahl-Hirschman Index (concentration) */
  hhi: number;
  /** Top 3 positions as percent of portfolio */
  top3Concentration: number;
  /** Weighted portfolio beta */
  weightedBeta: number;
  /** Portfolio yield (dividends + income / total value) */
  portfolioYield: number;
  /** Total annual income estimate */
  annualIncome: number;
}

/**
 * Target allocation model for rebalancing.
 */
export interface AllocationTarget {
  id: string;
  name: string;
  /** Target slices (must sum to 1.0) */
  targets: AllocationTargetEntry[];
  /** Rebalance tolerance — only flag when drift exceeds this */
  tolerancePercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface AllocationTargetEntry {
  /** Can be a ticker, sector, or asset class depending on targetType */
  label: string;
  targetType: 'ticker' | 'sector' | 'asset_class';
  weight: number;
}

/**
 * A rebalance action — the delta between current and target.
 */
export interface RebalanceAction {
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  deltaWeight: number;
  /** Dollar amount to buy (positive) or sell (negative) */
  deltaAmount: number;
  /** Approximate shares to trade */
  deltaShares: number;
  /** The order to execute this action */
  orderId?: string;
}

// ============================================================================
// OBJECTIVES LAYER — User goals and income planning
// ============================================================================

/**
 * A user-defined investment objective.
 * Shapes how skills weight recommendations.
 */
export interface Objective {
  id: string;
  name: string;
  type: ObjectiveType;
  /** Target amount (e.g., $500/month income, $100k portfolio value) */
  targetAmount?: number;
  /** Target date (e.g., retire by 2040) */
  targetDate?: string;
  /** Risk tolerance for this objective */
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  /** Time horizon */
  timeHorizon: 'short' | 'medium' | 'long';
  /** Associated account IDs (or all if empty) */
  accountIds: string[];
  /** Whether this is the primary objective */
  primary: boolean;
  createdAt: string;
}

export type ObjectiveType =
  | 'growth'           // maximize long-term capital appreciation
  | 'income'           // generate regular cash flow (dividends, premiums)
  | 'preservation'     // protect capital, minimize drawdowns
  | 'speculation'      // high-risk/high-reward tactical trades
  | 'tax_optimization' // TFSA/RRSP strategy
  | 'custom';

// ============================================================================
// CHAT / ORCHESTRATION LAYER
// ============================================================================

/**
 * A conversation turn that may produce structured outputs.
 * The chat is the orchestrator — it chains skills and emits typed outputs.
 */
export interface ConversationOutput {
  /** The conversation/message ID this output was produced in */
  conversationId: string;
  messageId: string;
  /** What was produced */
  outputs: OutputItem[];
  /** Timestamp */
  createdAt: string;
}

export type OutputItem =
  | { type: 'signal'; data: Signal }
  | { type: 'strategy'; data: Strategy }
  | { type: 'analysis'; data: Analysis }
  | { type: 'alert'; data: Alert }
  | { type: 'rebalance'; data: RebalanceAction[] }
  | { type: 'portfolio_report'; data: PortfolioSnapshot };
