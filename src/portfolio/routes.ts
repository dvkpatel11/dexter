/**
 * Portfolio API Routes — HTTP handlers for portfolio management.
 *
 * Mounted under /api/portfolio/* in server.ts.
 * All handlers return Response objects (Bun-native).
 */

import * as snap from './snaptrade.js';
import * as store from './store.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function err(message: string, status = 400): Response {
  return json({ error: message }, status);
}

async function parseBody<T>(req: Request): Promise<T> {
  return (await req.json()) as T;
}

// ── SnapTrade: Accounts & Positions ─────────────────────────────────────────

export async function handleListAccounts(): Promise<Response> {
  try {
    const accounts = await snap.listAccounts();
    return json(accounts);
  } catch (e: any) {
    return err(e.message, 500);
  }
}

export async function handleGetPositions(accountId: string): Promise<Response> {
  try {
    const [positions, optionPositions] = await Promise.all([
      snap.listPositions(accountId),
      snap.listOptionPositions(accountId),
    ]);
    return json([...positions, ...optionPositions]);
  } catch (e: any) {
    return err(e.message, 500);
  }
}

export async function handleGetAllPositions(): Promise<Response> {
  try {
    const accounts = await snap.listAccounts();
    const allPositions = await Promise.all(
      accounts.map(async (a) => {
        const [positions, options] = await Promise.all([
          snap.listPositions(a.id),
          snap.listOptionPositions(a.id),
        ]);
        return [...positions, ...options];
      }),
    );
    return json(allPositions.flat());
  } catch (e: any) {
    return err(e.message, 500);
  }
}

export async function handleGetBalance(accountId: string): Promise<Response> {
  try {
    const balance = await snap.getBalance(accountId);
    return json(balance);
  } catch (e: any) {
    return err(e.message, 500);
  }
}

export async function handleGetPortfolioSnapshot(): Promise<Response> {
  try {
    const accounts = await snap.listAccounts();
    const allPositions: any[] = [];
    const allBalances: any[] = [];

    await Promise.all(
      accounts.map(async (a) => {
        const [positions, options, balance] = await Promise.all([
          snap.listPositions(a.id),
          snap.listOptionPositions(a.id),
          snap.getBalance(a.id),
        ]);
        allPositions.push(...positions, ...options);

        const positionValue = [...positions, ...options].reduce((sum, p) => sum + p.marketValue, 0);
        allBalances.push({
          ...balance,
          marketValue: positionValue,
          totalValue: balance.cash + positionValue,
          cashPercent: positionValue + balance.cash > 0
            ? (balance.cash / (positionValue + balance.cash)) * 100
            : 0,
        });
      }),
    );

    const totalValue = allBalances.reduce((sum, b) => sum + b.totalValue, 0);
    const totalCash = allBalances.reduce((sum, b) => sum + b.cash, 0);

    return json({
      accounts,
      totalValue,
      totalCash,
      cashPercent: totalValue > 0 ? (totalCash / totalValue) * 100 : 0,
      positions: allPositions,
      balances: allBalances,
      snapshotAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return err(e.message, 500);
  }
}

// ── SnapTrade: Orders & Trading ─────────────────────────────────────────────

export async function handleListOrders(accountId: string, state?: string): Promise<Response> {
  try {
    const orders = await snap.listOrders(accountId, (state as any) ?? 'all');
    return json(orders);
  } catch (e: any) {
    return err(e.message, 500);
  }
}

export async function handleGetOrderImpact(req: Request): Promise<Response> {
  try {
    const body = await parseBody<{
      accountId: string;
      symbol: string;
      side: 'buy' | 'sell';
      quantity: number;
      orderType?: string;
      limitPrice?: number;
      stopPrice?: number;
    }>(req);

    if (!body.accountId || !body.symbol || !body.side || !body.quantity) {
      return err('Required: accountId, symbol, side, quantity');
    }

    const impact = await snap.getOrderImpact(
      body.accountId, body.symbol, body.side, body.quantity,
      (body.orderType as any) ?? 'market', body.limitPrice, body.stopPrice,
    );
    return json(impact);
  } catch (e: any) {
    return err(e.message, 500);
  }
}

export async function handleExecuteOrder(req: Request): Promise<Response> {
  try {
    const body = await parseBody<{ tradeId: string }>(req);
    if (!body.tradeId) return err('Required: tradeId');

    const order = await snap.executeOrder(body.tradeId);
    return json(order);
  } catch (e: any) {
    return err(e.message, 500);
  }
}

export async function handleCancelOrder(req: Request): Promise<Response> {
  try {
    const body = await parseBody<{ accountId: string; orderId: string }>(req);
    if (!body.accountId || !body.orderId) return err('Required: accountId, orderId');

    await snap.cancelOrder(body.accountId, body.orderId);
    return json({ cancelled: true });
  } catch (e: any) {
    return err(e.message, 500);
  }
}

// ── SnapTrade: Transactions ─────────────────────────────────────────────────

export async function handleListTransactions(accountId: string, url: URL): Promise<Response> {
  try {
    const startDate = url.searchParams.get('startDate') ?? undefined;
    const endDate = url.searchParams.get('endDate') ?? undefined;
    const transactions = await snap.listTransactions(accountId, startDate, endDate);
    return json(transactions);
  } catch (e: any) {
    return err(e.message, 500);
  }
}

// ── SnapTrade: Connection Management ────────────────────────────────────────

export async function handleGetLoginUrl(): Promise<Response> {
  try {
    const url = await snap.getLoginUrl();
    return json({ url });
  } catch (e: any) {
    return err(e.message, 500);
  }
}

export async function handleListConnections(): Promise<Response> {
  try {
    const connections = await snap.listConnections();
    return json(connections);
  } catch (e: any) {
    return err(e.message, 500);
  }
}

// ── Store: Signals ──────────────────────────────────────────────────────────

export async function handleListSignals(url: URL): Promise<Response> {
  const status = url.searchParams.get('status') ?? undefined;
  const symbol = url.searchParams.get('symbol') ?? undefined;
  return json(store.listSignals({ status, symbol }));
}

export async function handleCreateSignal(req: Request): Promise<Response> {
  const body = await parseBody<any>(req);
  const signal = store.createSignal(body);
  return json(signal, 201);
}

export async function handleUpdateSignalStatus(id: string, req: Request): Promise<Response> {
  const body = await parseBody<{ status: string }>(req);
  store.updateSignalStatus(id, body.status as any);
  return json({ updated: true });
}

// ── Store: Strategies ───────────────────────────────────────────────────────

export async function handleListStrategies(url: URL): Promise<Response> {
  const status = url.searchParams.get('status') ?? undefined;
  return json(store.listStrategies({ status }));
}

export async function handleCreateStrategy(req: Request): Promise<Response> {
  const body = await parseBody<any>(req);
  const strategy = store.createStrategy(body);
  return json(strategy, 201);
}

export async function handleUpdateStrategyStatus(id: string, req: Request): Promise<Response> {
  const body = await parseBody<{ status: string }>(req);
  store.updateStrategyStatus(id, body.status as any);
  return json({ updated: true });
}

// ── Store: Analyses ─────────────────────────────────────────────────────────

export async function handleListAnalyses(url: URL): Promise<Response> {
  const type = url.searchParams.get('type') ?? undefined;
  const subject = url.searchParams.get('subject') ?? undefined;
  return json(store.listAnalyses({ type, subject }));
}

// ── Store: Alerts ───────────────────────────────────────────────────────────

export async function handleListAlerts(url: URL): Promise<Response> {
  const severity = url.searchParams.get('severity') ?? undefined;
  const ack = url.searchParams.get('acknowledged');
  const acknowledged = ack === 'true' ? true : ack === 'false' ? false : undefined;
  return json(store.listAlerts({ acknowledged, severity }));
}

export async function handleAcknowledgeAlert(id: string): Promise<Response> {
  store.acknowledgeAlert(id);
  return json({ acknowledged: true });
}

// ── Store: Objectives ───────────────────────────────────────────────────────

export async function handleListObjectives(): Promise<Response> {
  return json(store.listObjectives());
}

export async function handleCreateObjective(req: Request): Promise<Response> {
  const body = await parseBody<any>(req);
  const objective = store.createObjective(body);
  return json(objective, 201);
}

export async function handleDeleteObjective(id: string): Promise<Response> {
  store.deleteObjective(id);
  return json({ deleted: true });
}

// ── Store: Allocation Targets ───────────────────────────────────────────────

export async function handleListAllocationTargets(): Promise<Response> {
  return json(store.listAllocationTargets());
}

export async function handleCreateAllocationTarget(req: Request): Promise<Response> {
  const body = await parseBody<any>(req);
  const target = store.createAllocationTarget(body);
  return json(target, 201);
}

export async function handleUpdateAllocationTarget(id: string, req: Request): Promise<Response> {
  const body = await parseBody<any>(req);
  store.updateAllocationTarget(id, body);
  return json({ updated: true });
}
