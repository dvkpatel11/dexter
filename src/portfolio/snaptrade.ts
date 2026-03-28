/**
 * SnapTrade API Client — wraps the SDK into Dexter's domain types.
 *
 * All broker-specific types are mapped to our portfolio/types.ts at the boundary.
 * The rest of the app never imports from snaptrade-typescript-sdk directly.
 *
 * Required env vars:
 *   SNAPTRADE_CLIENT_ID
 *   SNAPTRADE_CONSUMER_KEY
 *   SNAPTRADE_USER_ID      (registered via registerUser)
 *   SNAPTRADE_USER_SECRET   (returned from registerUser)
 */

import { Snaptrade } from 'snaptrade-typescript-sdk';
import type {
  Account,
  Balance,
  InstrumentType,
  Order,
  OrderImpact,
  OrderStatus,
  OrderType,
  OptionDetail,
  Position,
  TimeInForce,
  Transaction,
  TransactionType,
  Currency,
} from './types.js';

// ── Client singleton ────────────────────────────────────────────────────────

let _client: Snaptrade | null = null;

function getClient(): Snaptrade {
  if (_client) return _client;

  const clientId = process.env.SNAPTRADE_CLIENT_ID;
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;

  if (!clientId || !consumerKey) {
    throw new Error('SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY must be set');
  }

  _client = new Snaptrade({ clientId, consumerKey });
  return _client;
}

function getCredentials() {
  const userId = process.env.SNAPTRADE_USER_ID;
  const userSecret = process.env.SNAPTRADE_USER_SECRET;
  if (!userId || !userSecret) {
    throw new Error('SNAPTRADE_USER_ID and SNAPTRADE_USER_SECRET must be set');
  }
  return { userId, userSecret };
}

// ── User Registration ───────────────────────────────────────────────────────

export async function registerUser(userId: string): Promise<{ userId: string; userSecret: string }> {
  const client = getClient();
  const response = await client.authentication.registerSnapTradeUser({ userId });
  return {
    userId: response.data.userId ?? userId,
    userSecret: response.data.userSecret ?? '',
  };
}

export async function getLoginUrl(): Promise<string> {
  const client = getClient();
  const { userId, userSecret } = getCredentials();
  const response = await client.authentication.loginSnapTradeUser({ userId, userSecret });
  return response.data.redirectURI ?? response.data.loginRedirectURI ?? '';
}

// ── Accounts ────────────────────────────────────────────────────────────────

export async function listAccounts(): Promise<Account[]> {
  const client = getClient();
  const { userId, userSecret } = getCredentials();
  const response = await client.accountInformation.listUserAccounts({ userId, userSecret });

  return response.data.map((a: any) => ({
    id: a.id ?? '',
    brokerageAuthId: a.brokerage_authorization ?? '',
    name: a.name ?? `${a.institution_name ?? 'Account'} - ${a.number ?? ''}`,
    type: mapAccountType(a.meta?.type),
    number: a.number ?? '',
    tradingEnabled: true, // Assume true if connected with trade permission
    currency: (a.meta?.currency as Currency) ?? 'CAD',
    syncedAt: a.sync_status?.last_successful_sync ?? new Date().toISOString(),
    status: 'active' as const,
  }));
}

// ── Positions ───────────────────────────────────────────────────────────────

export async function listPositions(accountId: string): Promise<Position[]> {
  const client = getClient();
  const { userId, userSecret } = getCredentials();
  const response = await client.accountInformation.getUserAccountPositions({
    userId, userSecret, accountId,
  });

  return response.data.map((p: any) => {
    const qty = p.units ?? p.fractional_units ?? 0;
    const avgCost = p.average_purchase_price ?? 0;
    const price = p.symbol?.symbol?.current_price ?? p.price ?? 0;
    const marketValue = qty * price;
    const costBasis = qty * avgCost;
    const unrealizedPnl = marketValue - costBasis;
    const unrealizedPnlPercent = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

    return {
      id: `${accountId}_${p.symbol?.symbol?.symbol ?? p.symbol?.id ?? ''}`,
      accountId,
      symbol: p.symbol?.symbol?.symbol ?? '',
      name: p.symbol?.symbol?.description ?? p.symbol?.symbol?.symbol ?? '',
      instrumentType: mapInstrumentType(p.symbol?.symbol?.type?.code),
      quantity: qty,
      averageCost: avgCost,
      currentPrice: price,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPercent,
      currency: (p.symbol?.symbol?.currency?.code as Currency) ?? 'USD',
      priceUpdatedAt: new Date().toISOString(),
    } satisfies Position;
  });
}

export async function listOptionPositions(accountId: string): Promise<Position[]> {
  const client = getClient();
  const { userId, userSecret } = getCredentials();

  try {
    const response = await client.options.listOptionHoldings({
      userId, userSecret, accountId,
    });

    return response.data.map((op: any) => {
      const qty = op.units ?? 0;
      const price = op.price ?? 0;
      const marketValue = qty * price * 100; // options contracts = 100 shares

      return {
        id: `${accountId}_opt_${op.symbol ?? ''}`,
        accountId,
        symbol: op.symbol ?? '',
        name: op.option_symbol?.description ?? op.symbol ?? '',
        instrumentType: 'option' as InstrumentType,
        quantity: qty,
        averageCost: op.average_purchase_price ?? 0,
        currentPrice: price,
        marketValue,
        unrealizedPnl: 0, // Would need cost basis to compute
        unrealizedPnlPercent: 0,
        currency: (op.currency?.code as Currency) ?? 'USD',
        option: {
          type: op.option_symbol?.option_type === 'CALL' ? 'call' : 'put',
          strike: op.option_symbol?.strike_price ?? 0,
          expiry: op.option_symbol?.expiration_date ?? '',
          underlying: op.option_symbol?.ticker ?? '',
          multiplier: 100,
        } satisfies OptionDetail,
        priceUpdatedAt: new Date().toISOString(),
      } satisfies Position;
    });
  } catch {
    // Options not supported on this account/brokerage
    return [];
  }
}

// ── Balances ────────────────────────────────────────────────────────────────

export async function getBalance(accountId: string): Promise<Balance> {
  const client = getClient();
  const { userId, userSecret } = getCredentials();
  const response = await client.accountInformation.getUserAccountBalance({
    userId, userSecret, accountId,
  });

  let totalCash = 0;
  const currencyBalances: { currency: Currency; cash: number; marketValue: number }[] = [];

  for (const b of response.data) {
    const cash = b.cash ?? 0;
    totalCash += cash;
    currencyBalances.push({
      currency: (b.currency?.code as Currency) ?? 'CAD',
      cash,
      marketValue: 0, // Positions are separate
    });
  }

  // We'll compute totalValue in the store layer by combining positions + cash
  return {
    accountId,
    totalValue: totalCash, // Will be enriched by store
    cash: totalCash,
    cashPercent: 0, // Computed later
    marketValue: 0, // Computed later from positions
    currency: currencyBalances[0]?.currency ?? 'CAD',
    currencyBalances,
  };
}

// ── Orders ──────────────────────────────────────────────────────────────────

export async function listOrders(
  accountId: string,
  state: 'all' | 'open' | 'executed' = 'all'
): Promise<Order[]> {
  const client = getClient();
  const { userId, userSecret } = getCredentials();
  const response = await client.accountInformation.getUserAccountOrders({
    userId, userSecret, accountId, state,
  });

  return response.data.map((o: any) => ({
    id: o.brokerage_order_id ?? o.id ?? '',
    accountId,
    symbol: o.universal_symbol?.symbol ?? o.symbol ?? '',
    side: o.action === 'BUY' ? 'buy' as const : 'sell' as const,
    orderType: mapOrderType(o.order_type),
    timeInForce: mapTimeInForce(o.time_in_force),
    quantity: o.total_quantity ?? 0,
    limitPrice: o.limit_price ?? undefined,
    stopPrice: o.stop_price ?? undefined,
    status: mapOrderStatus(o.status),
    filledQuantity: o.filled_quantity ?? 0,
    fillPrice: o.execution_price ?? undefined,
    createdAt: o.time_placed ?? new Date().toISOString(),
    updatedAt: o.time_updated ?? o.time_placed ?? new Date().toISOString(),
  } satisfies Order));
}

export async function getOrderImpact(
  accountId: string,
  symbol: string,
  side: 'buy' | 'sell',
  quantity: number,
  orderType: OrderType = 'market',
  limitPrice?: number,
  stopPrice?: number,
): Promise<OrderImpact & { snapTradeId: string }> {
  const client = getClient();
  const { userId, userSecret } = getCredentials();

  const action = side === 'buy' ? 'BUY' : 'SELL';
  const type = orderType === 'market' ? 'Market'
    : orderType === 'limit' ? 'Limit'
    : orderType === 'stop' ? 'StopMarket'
    : 'StopLimit';

  const response = await client.trading.getOrderImpact({
    userId, userSecret,
    manualTradeForm: {
      account_id: accountId,
      action,
      universal_symbol_id: symbol,
      order_type: type,
      time_in_force: 'Day',
      units: quantity,
      ...(limitPrice !== undefined ? { price: limitPrice } : {}),
      ...(stopPrice !== undefined ? { stop: stopPrice } : {}),
    },
  });

  const data = response.data as any;
  return {
    orderId: '',
    snapTradeId: data.trade?.id ?? '',
    estimatedCost: data.trade?.price ?? 0,
    fees: data.combined_remaining_balance ? 0 : 0, // WS has no commissions
    remainingBuyingPower: data.combined_remaining_balance?.amount ?? 0,
    fxRate: data.fx_rate ?? undefined,
    warnings: data.warnings ?? [],
  };
}

export async function executeOrder(tradeId: string): Promise<Order> {
  const client = getClient();
  const { userId, userSecret } = getCredentials();

  const response = await client.trading.placeOrder({
    tradeId,
    userId,
    userSecret,
  });

  const o = response.data as any;
  return {
    id: o.brokerage_order_id ?? o.id ?? '',
    accountId: o.account ?? '',
    symbol: o.universal_symbol?.symbol ?? o.symbol ?? '',
    side: o.action === 'BUY' ? 'buy' : 'sell',
    orderType: mapOrderType(o.order_type),
    timeInForce: mapTimeInForce(o.time_in_force),
    quantity: o.total_quantity ?? 0,
    limitPrice: o.limit_price ?? undefined,
    stopPrice: o.stop_price ?? undefined,
    status: mapOrderStatus(o.status),
    filledQuantity: o.filled_quantity ?? 0,
    fillPrice: o.execution_price ?? undefined,
    createdAt: o.time_placed ?? new Date().toISOString(),
    updatedAt: o.time_updated ?? new Date().toISOString(),
  };
}

export async function cancelOrder(accountId: string, brokerageOrderId: string): Promise<void> {
  const client = getClient();
  const { userId, userSecret } = getCredentials();

  await client.trading.cancelOrder({
    userId, userSecret, accountId,
    accountInformationGetUserAccountOrderDetailRequest: { brokerage_order_id: brokerageOrderId },
  });
}

// ── Transactions ────────────────────────────────────────────────────────────

export async function listTransactions(
  accountId: string,
  startDate?: string,
  endDate?: string,
): Promise<Transaction[]> {
  const client = getClient();
  const { userId, userSecret } = getCredentials();

  const response = await client.accountInformation.getAccountActivities({
    accountId, userId, userSecret,
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  });

  const activities = (response.data as any)?.activities ?? response.data ?? [];

  return (Array.isArray(activities) ? activities : []).map((t: any) => ({
    id: t.id ?? '',
    accountId,
    symbol: t.symbol?.symbol ?? t.raw_symbol ?? '',
    type: mapTransactionType(t.type),
    side: t.type === 'BUY' ? 'buy' as const : t.type === 'SELL' ? 'sell' as const : undefined,
    quantity: t.units ?? 0,
    price: t.price ?? 0,
    amount: t.amount ?? 0,
    fees: t.fee ?? 0,
    currency: (t.currency?.code as Currency) ?? 'CAD',
    settledAt: t.settlement_date ?? t.trade_date ?? '',
    description: t.description ?? '',
  } satisfies Transaction));
}

// ── Connections ──────────────────────────────────────────────────────────────

export async function refreshConnection(authorizationId: string): Promise<void> {
  const client = getClient();
  const { userId, userSecret } = getCredentials();
  await client.connections.refreshBrokerageAuthorization({
    authorizationId, userId, userSecret,
  });
}

export async function listConnections() {
  const client = getClient();
  const { userId, userSecret } = getCredentials();
  const response = await client.connections.listBrokerageAuthorizations({ userId, userSecret });
  return response.data;
}

// ── Mappers ─────────────────────────────────────────────────────────────────

function mapAccountType(raw?: string): Account['type'] {
  const lower = (raw ?? '').toLowerCase();
  if (lower.includes('tfsa')) return 'tfsa';
  if (lower.includes('rrsp')) return 'rrsp';
  if (lower.includes('resp')) return 'resp';
  if (lower.includes('fhsa')) return 'fhsa';
  if (lower.includes('rdsp')) return 'rdsp';
  if (lower.includes('margin')) return 'margin';
  if (lower.includes('individual') || lower.includes('personal') || lower.includes('cash')) return 'personal';
  return 'other';
}

function mapInstrumentType(code?: string): InstrumentType {
  const c = (code ?? '').toUpperCase();
  if (c === 'EQUITY' || c === 'STOCK' || c === 'CS') return 'stock';
  if (c === 'ETF' || c === 'EF') return 'etf';
  if (c === 'OPTION' || c === 'OP') return 'option';
  if (c === 'BOND' || c === 'FI') return 'fixed_income';
  if (c === 'CRYPTO') return 'crypto';
  if (c === 'CASH') return 'cash';
  return 'other';
}

function mapOrderType(raw?: string): OrderType {
  const t = (raw ?? '').toLowerCase();
  if (t.includes('limit') && t.includes('stop')) return 'stop_limit';
  if (t.includes('stop')) return 'stop';
  if (t.includes('limit')) return 'limit';
  return 'market';
}

function mapTimeInForce(raw?: string): TimeInForce {
  const t = (raw ?? '').toLowerCase();
  if (t.includes('gtc')) return 'gtc';
  if (t.includes('fok')) return 'fok';
  return 'day';
}

function mapOrderStatus(raw?: string): OrderStatus {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('fill') && s.includes('partial')) return 'partial';
  if (s.includes('fill') || s.includes('executed')) return 'filled';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('reject')) return 'rejected';
  if (s.includes('expired')) return 'expired';
  if (s.includes('pending') || s.includes('new') || s.includes('open')) return 'submitted';
  return 'draft';
}

function mapTransactionType(raw?: string): TransactionType {
  const t = (raw ?? '').toUpperCase();
  if (t === 'BUY') return 'buy';
  if (t === 'SELL') return 'sell';
  if (t.includes('DIV')) return 'dividend';
  if (t.includes('CONTRIBUTION') || t.includes('DEPOSIT')) return 'contribution';
  if (t.includes('WITHDRAW')) return 'withdrawal';
  if (t.includes('FEE') || t.includes('COMMISSION')) return 'fee';
  if (t.includes('INTEREST')) return 'interest';
  if (t.includes('TRANSFER')) return 'transfer';
  if (t.includes('ASSIGN')) return 'option_assignment';
  if (t.includes('EXERCISE')) return 'option_exercise';
  if (t.includes('EXPIR')) return 'option_expiry';
  return 'other';
}
