/**
 * Portfolio Store — SQLite persistence for Dexter-generated portfolio intelligence.
 *
 * Stores: Signals, Strategies, Analyses, Alerts, Objectives, Allocation Targets.
 * Broker data (positions, balances, orders) is fetched live from SnapTrade — not cached here.
 *
 * Database location: .dexter/portfolio.sqlite
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { dexterPath } from '../utils/paths.js';
import type {
  Alert,
  AllocationTarget,
  AllocationTargetEntry,
  Analysis,
  AnalysisType,
  Objective,
  ObjectiveType,
  RebalanceAction,
  Signal,
  SkillSource,
  Strategy,
  StrategyLeg,
  RiskMetrics,
} from './types.js';

// ── Database ────────────────────────────────────────────────────────────────

const DB_PATH = dexterPath('portfolio.sqlite');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      conviction TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      thesis TEXT NOT NULL,
      invalidation TEXT NOT NULL,
      catalyst TEXT,
      source TEXT NOT NULL,
      evidence TEXT NOT NULL,        -- JSON array
      target_price REAL,
      stop_price REAL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS strategies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      signal_ids TEXT NOT NULL,       -- JSON array
      direction TEXT NOT NULL,
      legs TEXT NOT NULL,             -- JSON array of StrategyLeg
      risk TEXT NOT NULL,             -- JSON RiskMetrics
      dependencies TEXT NOT NULL,     -- JSON array
      status TEXT NOT NULL DEFAULT 'proposed',
      execution_mode TEXT NOT NULL DEFAULT 'auto',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      type TEXT NOT NULL,
      summary TEXT NOT NULL,
      source TEXT NOT NULL,
      findings TEXT NOT NULL,         -- JSON array
      confidence TEXT NOT NULL,
      confidence_rationale TEXT NOT NULL,
      limitations TEXT NOT NULL,      -- JSON array
      body TEXT NOT NULL,
      signal_ids TEXT NOT NULL,       -- JSON array
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      severity TEXT NOT NULL,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      suggested_action TEXT,
      related_signal_id TEXT,
      related_strategy_id TEXT,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS objectives (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      target_amount REAL,
      target_date TEXT,
      risk_tolerance TEXT NOT NULL,
      time_horizon TEXT NOT NULL,
      account_ids TEXT NOT NULL,      -- JSON array
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS allocation_targets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      targets TEXT NOT NULL,          -- JSON array of AllocationTargetEntry
      tolerance_percent REAL NOT NULL DEFAULT 2.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol);
    CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
    CREATE INDEX IF NOT EXISTS idx_strategies_status ON strategies(status);
    CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
  `);
}

// ── Signals ─────────────────────────────────────────────────────────────────

export function createSignal(signal: Omit<Signal, 'id' | 'createdAt' | 'status'>): Signal {
  const db = getDb();
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO signals (id, symbol, direction, conviction, timeframe, thesis, invalidation,
      catalyst, source, evidence, target_price, stop_price, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(
    id, signal.symbol, signal.direction, signal.conviction, signal.timeframe,
    signal.thesis, signal.invalidation, signal.catalyst ?? null, signal.source,
    JSON.stringify(signal.evidence), signal.targetPrice ?? null,
    signal.stopPrice ?? null, createdAt, signal.expiresAt ?? null,
  );

  return { ...signal, id, status: 'active', createdAt };
}

export function getSignal(id: string): Signal | null {
  const row = getDb().prepare('SELECT * FROM signals WHERE id = ?').get(id) as any;
  return row ? mapSignalRow(row) : null;
}

export function listSignals(filter?: { status?: string; symbol?: string }): Signal[] {
  const db = getDb();
  let sql = 'SELECT * FROM signals WHERE 1=1';
  const params: any[] = [];

  if (filter?.status) { sql += ' AND status = ?'; params.push(filter.status); }
  if (filter?.symbol) { sql += ' AND symbol = ?'; params.push(filter.symbol); }

  sql += ' ORDER BY created_at DESC';
  return (db.prepare(sql).all(...params) as any[]).map(mapSignalRow);
}

export function updateSignalStatus(id: string, status: Signal['status']): void {
  getDb().prepare('UPDATE signals SET status = ? WHERE id = ?').run(status, id);
}

// ── Strategies ──────────────────────────────────────────────────────────────

export function createStrategy(strategy: Omit<Strategy, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Strategy {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO strategies (id, name, signal_ids, direction, legs, risk, dependencies,
      status, execution_mode, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'proposed', ?, ?, ?)
  `).run(
    id, strategy.name, JSON.stringify(strategy.signalIds), strategy.direction,
    JSON.stringify(strategy.legs), JSON.stringify(strategy.risk),
    JSON.stringify(strategy.dependencies), strategy.executionMode, now, now,
  );

  return { ...strategy, id, status: 'proposed', createdAt: now, updatedAt: now };
}

export function getStrategy(id: string): Strategy | null {
  const row = getDb().prepare('SELECT * FROM strategies WHERE id = ?').get(id) as any;
  return row ? mapStrategyRow(row) : null;
}

export function listStrategies(filter?: { status?: string }): Strategy[] {
  const db = getDb();
  let sql = 'SELECT * FROM strategies WHERE 1=1';
  const params: any[] = [];

  if (filter?.status) { sql += ' AND status = ?'; params.push(filter.status); }

  sql += ' ORDER BY created_at DESC';
  return (db.prepare(sql).all(...params) as any[]).map(mapStrategyRow);
}

export function updateStrategyStatus(id: string, status: Strategy['status']): void {
  const now = new Date().toISOString();
  getDb().prepare('UPDATE strategies SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
}

// ── Analyses ────────────────────────────────────────────────────────────────

export function createAnalysis(analysis: Omit<Analysis, 'id' | 'createdAt'>): Analysis {
  const db = getDb();
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO analyses (id, subject, type, summary, source, findings, confidence,
      confidence_rationale, limitations, body, signal_ids, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, analysis.subject, analysis.type, analysis.summary, analysis.source,
    JSON.stringify(analysis.findings), analysis.confidence, analysis.confidenceRationale,
    JSON.stringify(analysis.limitations), analysis.body,
    JSON.stringify(analysis.signalIds), createdAt,
  );

  return { ...analysis, id, createdAt };
}

export function getAnalysis(id: string): Analysis | null {
  const row = getDb().prepare('SELECT * FROM analyses WHERE id = ?').get(id) as any;
  return row ? mapAnalysisRow(row) : null;
}

export function listAnalyses(filter?: { type?: string; subject?: string }): Analysis[] {
  const db = getDb();
  let sql = 'SELECT * FROM analyses WHERE 1=1';
  const params: any[] = [];

  if (filter?.type) { sql += ' AND type = ?'; params.push(filter.type); }
  if (filter?.subject) { sql += ' AND subject = ?'; params.push(filter.subject); }

  sql += ' ORDER BY created_at DESC';
  return (db.prepare(sql).all(...params) as any[]).map(mapAnalysisRow);
}

// ── Alerts ──────────────────────────────────────────────────────────────────

export function createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'acknowledged'>): Alert {
  const db = getDb();
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO alerts (id, severity, subject, title, description, suggested_action,
      related_signal_id, related_strategy_id, acknowledged, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    id, alert.severity, alert.subject, alert.title, alert.description,
    alert.suggestedAction ?? null, alert.relatedSignalId ?? null,
    alert.relatedStrategyId ?? null, createdAt,
  );

  return { ...alert, id, acknowledged: false, createdAt };
}

export function listAlerts(filter?: { acknowledged?: boolean; severity?: string }): Alert[] {
  const db = getDb();
  let sql = 'SELECT * FROM alerts WHERE 1=1';
  const params: any[] = [];

  if (filter?.acknowledged !== undefined) {
    sql += ' AND acknowledged = ?';
    params.push(filter.acknowledged ? 1 : 0);
  }
  if (filter?.severity) { sql += ' AND severity = ?'; params.push(filter.severity); }

  sql += ' ORDER BY created_at DESC';
  return (db.prepare(sql).all(...params) as any[]).map(mapAlertRow);
}

export function acknowledgeAlert(id: string): void {
  getDb().prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(id);
}

// ── Objectives ──────────────────────────────────────────────────────────────

export function createObjective(obj: Omit<Objective, 'id' | 'createdAt'>): Objective {
  const db = getDb();
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO objectives (id, name, type, target_amount, target_date, risk_tolerance,
      time_horizon, account_ids, is_primary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, obj.name, obj.type, obj.targetAmount ?? null, obj.targetDate ?? null,
    obj.riskTolerance, obj.timeHorizon, JSON.stringify(obj.accountIds),
    obj.primary ? 1 : 0, createdAt,
  );

  return { ...obj, id, createdAt };
}

export function listObjectives(): Objective[] {
  return (getDb().prepare('SELECT * FROM objectives ORDER BY is_primary DESC, created_at DESC').all() as any[])
    .map(mapObjectiveRow);
}

export function deleteObjective(id: string): void {
  getDb().prepare('DELETE FROM objectives WHERE id = ?').run(id);
}

// ── Allocation Targets ──────────────────────────────────────────────────────

export function createAllocationTarget(target: Omit<AllocationTarget, 'id' | 'createdAt' | 'updatedAt'>): AllocationTarget {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO allocation_targets (id, name, targets, tolerance_percent, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, target.name, JSON.stringify(target.targets), target.tolerancePercent, now, now);

  return { ...target, id, createdAt: now, updatedAt: now };
}

export function getAllocationTarget(id: string): AllocationTarget | null {
  const row = getDb().prepare('SELECT * FROM allocation_targets WHERE id = ?').get(id) as any;
  return row ? mapAllocationTargetRow(row) : null;
}

export function listAllocationTargets(): AllocationTarget[] {
  return (getDb().prepare('SELECT * FROM allocation_targets ORDER BY created_at DESC').all() as any[])
    .map(mapAllocationTargetRow);
}

export function updateAllocationTarget(id: string, updates: Partial<Pick<AllocationTarget, 'name' | 'targets' | 'tolerancePercent'>>): void {
  const now = new Date().toISOString();
  const fields: string[] = ['updated_at = ?'];
  const params: any[] = [now];

  if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
  if (updates.targets !== undefined) { fields.push('targets = ?'); params.push(JSON.stringify(updates.targets)); }
  if (updates.tolerancePercent !== undefined) { fields.push('tolerance_percent = ?'); params.push(updates.tolerancePercent); }

  params.push(id);
  getDb().prepare(`UPDATE allocation_targets SET ${fields.join(', ')} WHERE id = ?`).run(...params);
}

// ── Row Mappers ─────────────────────────────────────────────────────────────

function mapSignalRow(row: any): Signal {
  return {
    id: row.id,
    symbol: row.symbol,
    direction: row.direction,
    conviction: row.conviction,
    timeframe: row.timeframe,
    thesis: row.thesis,
    invalidation: row.invalidation,
    catalyst: row.catalyst ?? undefined,
    source: row.source as SkillSource,
    evidence: JSON.parse(row.evidence),
    targetPrice: row.target_price ?? undefined,
    stopPrice: row.stop_price ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? undefined,
  };
}

function mapStrategyRow(row: any): Strategy {
  return {
    id: row.id,
    name: row.name,
    signalIds: JSON.parse(row.signal_ids),
    direction: row.direction,
    legs: JSON.parse(row.legs) as StrategyLeg[],
    risk: JSON.parse(row.risk) as RiskMetrics,
    dependencies: JSON.parse(row.dependencies),
    status: row.status,
    executionMode: row.execution_mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAnalysisRow(row: any): Analysis {
  return {
    id: row.id,
    subject: row.subject,
    type: row.type as AnalysisType,
    summary: row.summary,
    source: row.source as SkillSource,
    findings: JSON.parse(row.findings),
    confidence: row.confidence,
    confidenceRationale: row.confidence_rationale,
    limitations: JSON.parse(row.limitations),
    body: row.body,
    signalIds: JSON.parse(row.signal_ids),
    createdAt: row.created_at,
  };
}

function mapAlertRow(row: any): Alert {
  return {
    id: row.id,
    severity: row.severity,
    subject: row.subject,
    title: row.title,
    description: row.description,
    suggestedAction: row.suggested_action ?? undefined,
    relatedSignalId: row.related_signal_id ?? undefined,
    relatedStrategyId: row.related_strategy_id ?? undefined,
    acknowledged: Boolean(row.acknowledged),
    createdAt: row.created_at,
  };
}

function mapObjectiveRow(row: any): Objective {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ObjectiveType,
    targetAmount: row.target_amount ?? undefined,
    targetDate: row.target_date ?? undefined,
    riskTolerance: row.risk_tolerance,
    timeHorizon: row.time_horizon,
    accountIds: JSON.parse(row.account_ids),
    primary: Boolean(row.is_primary),
    createdAt: row.created_at,
  };
}

function mapAllocationTargetRow(row: any): AllocationTarget {
  return {
    id: row.id,
    name: row.name,
    targets: JSON.parse(row.targets) as AllocationTargetEntry[],
    tolerancePercent: row.tolerance_percent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
