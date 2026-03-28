/**
 * API client for Dexter backend.
 * All fetch calls go through here for consistent error handling.
 */

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Providers & Models ───────────────────────────────────────────────────

export interface ProviderInfo {
  id: string;
  displayName: string;
  hasKey: boolean;
}

export interface ModelInfo {
  id: string;
  displayName: string;
}

export function fetchProviders() {
  return request<ProviderInfo[]>('/providers');
}

export function fetchModels(providerId: string) {
  return request<ModelInfo[]>(`/models/${providerId}`);
}

// ── Agent ─────────────────────────────────────────────────────────────────

export function queryAgent(query: string, sessionKey?: string, model?: string) {
  return request<{ answer: string; iterations: number; toolCalls: any[] }>('/query', {
    method: 'POST',
    body: JSON.stringify({ query, sessionKey, model, approvalMode: 'auto-approve', memory: true }),
  });
}

export function streamAgent(
  query: string,
  onEvent: (event: string, data: any) => void,
  sessionKey?: string,
  model?: string,
): AbortController {
  const controller = new AbortController();

  fetch(`${BASE}/query/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, sessionKey, model, approvalMode: 'auto-approve', memory: true }),
    signal: controller.signal,
  }).then(async (res) => {
    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7);
        } else if (line.startsWith('data: ') && eventType) {
          try {
            onEvent(eventType, JSON.parse(line.slice(6)));
          } catch { /* skip malformed */ }
          eventType = '';
        }
      }
    }
  }).catch(() => { /* aborted or network error */ });

  return controller;
}

// ── Portfolio: SnapTrade ──────────────────────────────────────────────────

export const portfolio = {
  snapshot: () => request<any>('/portfolio/snapshot'),
  accounts: () => request<any[]>('/portfolio/accounts'),
  positions: (accountId: string) => request<any[]>(`/portfolio/accounts/${accountId}/positions`),
  allPositions: () => request<any[]>('/portfolio/positions'),
  balance: (accountId: string) => request<any>(`/portfolio/accounts/${accountId}/balance`),
  orders: (accountId: string) => request<any[]>(`/portfolio/accounts/${accountId}/orders`),
  transactions: (accountId: string) => request<any[]>(`/portfolio/accounts/${accountId}/transactions`),
  orderImpact: (data: any) => request<any>('/portfolio/orders/impact', { method: 'POST', body: JSON.stringify(data) }),
  executeOrder: (tradeId: string) => request<any>('/portfolio/orders/execute', { method: 'POST', body: JSON.stringify({ tradeId }) }),
  cancelOrder: (accountId: string, orderId: string) => request<any>('/portfolio/orders/cancel', { method: 'POST', body: JSON.stringify({ accountId, orderId }) }),
  connectUrl: () => request<{ url: string }>('/portfolio/connect'),
  connections: () => request<any[]>('/portfolio/connections'),
};

// ── Portfolio: Intelligence ─────────────────────────────────────────────

export const intelligence = {
  signals: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/portfolio/signals${qs}`);
  },
  createSignal: (data: any) => request<any>('/portfolio/signals', { method: 'POST', body: JSON.stringify(data) }),
  updateSignalStatus: (id: string, status: string) =>
    request<any>(`/portfolio/signals/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  strategies: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/portfolio/strategies${qs}`);
  },
  createStrategy: (data: any) => request<any>('/portfolio/strategies', { method: 'POST', body: JSON.stringify(data) }),
  updateStrategyStatus: (id: string, status: string) =>
    request<any>(`/portfolio/strategies/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  analyses: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/portfolio/analyses${qs}`);
  },

  alerts: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/portfolio/alerts${qs}`);
  },
  acknowledgeAlert: (id: string) => request<any>(`/portfolio/alerts/${id}/acknowledge`, { method: 'POST' }),

  objectives: () => request<any[]>('/portfolio/objectives'),
  createObjective: (data: any) => request<any>('/portfolio/objectives', { method: 'POST', body: JSON.stringify(data) }),
  deleteObjective: (id: string) => request<any>(`/portfolio/objectives/${id}`, { method: 'DELETE' }),

  allocationTargets: () => request<any[]>('/portfolio/allocation-targets'),
  createAllocationTarget: (data: any) => request<any>('/portfolio/allocation-targets', { method: 'POST', body: JSON.stringify(data) }),
};
