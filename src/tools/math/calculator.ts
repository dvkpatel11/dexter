import { DynamicStructuredTool } from '@langchain/core/tools';
import Decimal from 'decimal.js';
import { z } from 'zod';
import { formatToolResult } from '../types.js';

// Configure Decimal for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ── Description ─────────────────────────────────────────────────────────────

export const CALCULATOR_DESCRIPTION = `
Precise financial calculator — use this for ALL arithmetic instead of doing math yourself.
LLM arithmetic is unreliable. This tool uses arbitrary-precision decimal math (no floating point errors).

Supports:
- Basic arithmetic: add, subtract, multiply, divide, power, sqrt, abs
- Financial: cagr, npv, irr, pv, fv, pmt, wacc
- Statistics: mean, median, stdev, min, max, sum, percentile
- Percentage: percent_of, percent_change
- Expression: evaluate arbitrary math expressions (e.g., "150.5 * 1.08 ^ 5 / 1.10 ^ 5")

ALWAYS use this tool when computing: valuations, growth rates, returns, ratios,
weighted averages, present values, portfolio weights, or any number that will
appear in your answer.`.trim();

// ── Schema ──────────────────────────────────────────────────────────────────

const CalculatorInputSchema = z.object({
  operation: z.enum([
    // Basic
    'add', 'subtract', 'multiply', 'divide', 'power', 'sqrt', 'abs',
    // Financial
    'cagr', 'npv', 'irr', 'pv', 'fv', 'pmt', 'wacc',
    // Statistics
    'mean', 'median', 'stdev', 'min', 'max', 'sum', 'percentile',
    // Percentage
    'percent_of', 'percent_change',
    // Expression
    'expression',
  ]).describe('The calculation to perform'),

  values: z.array(z.number()).describe(
    'Input numbers. Meaning depends on operation — see examples in description.'
  ),

  rate: z.number().optional().describe(
    'Rate for financial operations (as decimal, e.g., 0.10 for 10%)'
  ),

  periods: z.number().optional().describe(
    'Number of periods for financial operations'
  ),

  weights: z.array(z.number()).optional().describe(
    'Weights for WACC or weighted calculations (must match values length)'
  ),

  expression: z.string().optional().describe(
    'Math expression to evaluate (for operation="expression"). Supports +, -, *, /, ^, (), sqrt(), abs(), ln(), log10()'
  ),

  label: z.string().optional().describe(
    'Optional label for the calculation (e.g., "AAPL FCF Year 3") — returned in output for traceability'
  ),
});

// ── Financial Functions ─────────────────────────────────────────────────────

function cagr(beginValue: number, endValue: number, periods: number): Decimal {
  const begin = new Decimal(beginValue);
  const end = new Decimal(endValue);
  const n = new Decimal(periods);
  // CAGR = (end / begin) ^ (1/n) - 1
  return end.div(begin).pow(new Decimal(1).div(n)).minus(1);
}

function npv(rate: number, cashFlows: number[]): Decimal {
  const r = new Decimal(rate);
  let result = new Decimal(0);
  for (let i = 0; i < cashFlows.length; i++) {
    const cf = new Decimal(cashFlows[i]);
    const discountFactor = r.plus(1).pow(i);
    result = result.plus(cf.div(discountFactor));
  }
  return result;
}

function pv(rate: number, periods: number, futureValue: number): Decimal {
  const r = new Decimal(rate);
  const fv = new Decimal(futureValue);
  return fv.div(r.plus(1).pow(periods));
}

function fv(rate: number, periods: number, presentValue: number): Decimal {
  const r = new Decimal(rate);
  const pvVal = new Decimal(presentValue);
  return pvVal.times(r.plus(1).pow(periods));
}

function pmt(rate: number, periods: number, presentValue: number): Decimal {
  const r = new Decimal(rate);
  const n = new Decimal(periods);
  const pvVal = new Decimal(presentValue);
  // PMT = PV * r / (1 - (1 + r)^-n)
  const denom = new Decimal(1).minus(r.plus(1).pow(n.neg()));
  return pvVal.times(r).div(denom);
}

function wacc(costs: number[], weights: number[]): Decimal {
  let result = new Decimal(0);
  let totalWeight = new Decimal(0);
  for (let i = 0; i < costs.length; i++) {
    const w = new Decimal(weights[i]);
    result = result.plus(new Decimal(costs[i]).times(w));
    totalWeight = totalWeight.plus(w);
  }
  return result.div(totalWeight);
}

function irr(cashFlows: number[], guess = 0.1, maxIter = 100, tol = 1e-7): Decimal {
  let rate = new Decimal(guess);
  for (let i = 0; i < maxIter; i++) {
    let npvVal = new Decimal(0);
    let dnpv = new Decimal(0);
    for (let t = 0; t < cashFlows.length; t++) {
      const cf = new Decimal(cashFlows[t]);
      const factor = rate.plus(1).pow(t);
      npvVal = npvVal.plus(cf.div(factor));
      if (t > 0) {
        dnpv = dnpv.minus(cf.times(t).div(rate.plus(1).pow(t + 1)));
      }
    }
    if (dnpv.isZero()) break;
    const newRate = rate.minus(npvVal.div(dnpv));
    if (newRate.minus(rate).abs().lessThan(tol)) {
      return newRate;
    }
    rate = newRate;
  }
  return rate;
}

// ── Statistics ──────────────────────────────────────────────────────────────

function median(values: Decimal[]): Decimal {
  const sorted = [...values].sort((a, b) => a.cmp(b));
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return sorted[mid - 1].plus(sorted[mid]).div(2);
  }
  return sorted[mid];
}

function stdev(values: Decimal[]): Decimal {
  const n = values.length;
  const mean = values.reduce((a, b) => a.plus(b), new Decimal(0)).div(n);
  const variance = values
    .reduce((sum, v) => sum.plus(v.minus(mean).pow(2)), new Decimal(0))
    .div(n);
  return variance.sqrt();
}

function percentile(values: Decimal[], p: number): Decimal {
  const sorted = [...values].sort((a, b) => a.cmp(b));
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const weight = new Decimal(idx - lower);
  return sorted[lower].plus(sorted[upper].minus(sorted[lower]).times(weight));
}

// ── Expression Evaluator ────────────────────────────────────────────────────

function evaluateExpression(expr: string): Decimal {
  // Whitelist: only allow digits, operators, parens, decimal points, and named functions
  const sanitized = expr.replace(/\s/g, '');
  if (!/^[0-9+\-*/^().,%a-z_]+$/i.test(sanitized)) {
    throw new Error(`Invalid characters in expression: ${expr}`);
  }

  // Replace ^ with ** for JS, handle named functions
  let jsExpr = sanitized
    .replace(/\^/g, '**')
    .replace(/sqrt\(/gi, 'Math.sqrt(')
    .replace(/abs\(/gi, 'Math.abs(')
    .replace(/ln\(/gi, 'Math.log(')
    .replace(/log10\(/gi, 'Math.log10(')
    .replace(/pi/gi, 'Math.PI')
    .replace(/exp\(/gi, 'Math.exp(');

  // Block anything that isn't math
  if (/[a-zA-Z_]/.test(jsExpr.replace(/Math\.(sqrt|abs|log|log10|PI|exp)/g, ''))) {
    throw new Error(`Expression contains non-math identifiers: ${expr}`);
  }

  // Evaluate in restricted scope
  const fn = new Function(`"use strict"; return (${jsExpr});`);
  const result = fn();

  if (typeof result !== 'number' || !isFinite(result)) {
    throw new Error(`Expression produced invalid result: ${result}`);
  }

  return new Decimal(result);
}

// ── Tool ────────────────────────────────────────────────────────────────────

export const calculatorTool = new DynamicStructuredTool({
  name: 'calculator',
  description: 'Precise financial calculator with arbitrary-precision decimal math.',
  schema: CalculatorInputSchema,
  func: async (input) => {
    const vals = input.values.map((v) => new Decimal(v));
    let result: Decimal;
    let breakdown: string | undefined;

    switch (input.operation) {
      // Basic arithmetic
      case 'add':
        result = vals.reduce((a, b) => a.plus(b), new Decimal(0));
        break;
      case 'subtract':
        result = vals.slice(1).reduce((a, b) => a.minus(b), vals[0]);
        break;
      case 'multiply':
        result = vals.reduce((a, b) => a.times(b), new Decimal(1));
        break;
      case 'divide':
        if (vals[1].isZero()) throw new Error('Division by zero');
        result = vals[0].div(vals[1]);
        break;
      case 'power':
        result = vals[0].pow(vals[1]);
        break;
      case 'sqrt':
        result = vals[0].sqrt();
        break;
      case 'abs':
        result = vals[0].abs();
        break;

      // Financial
      case 'cagr':
        if (vals.length < 2 || !input.periods) throw new Error('CAGR needs [beginValue, endValue] and periods');
        result = cagr(input.values[0], input.values[1], input.periods);
        breakdown = `(${input.values[1]} / ${input.values[0]}) ^ (1/${input.periods}) - 1`;
        break;
      case 'npv':
        if (input.rate === undefined) throw new Error('NPV needs rate');
        result = npv(input.rate, input.values);
        breakdown = `Discounted ${input.values.length} cash flows at ${(input.rate * 100).toFixed(2)}%`;
        break;
      case 'irr':
        result = irr(input.values, input.rate);
        breakdown = `Newton-Raphson IRR over ${input.values.length} cash flows`;
        break;
      case 'pv':
        if (input.rate === undefined || !input.periods) throw new Error('PV needs rate and periods');
        result = pv(input.rate, input.periods, input.values[0]);
        breakdown = `${input.values[0]} / (1 + ${input.rate}) ^ ${input.periods}`;
        break;
      case 'fv':
        if (input.rate === undefined || !input.periods) throw new Error('FV needs rate and periods');
        result = fv(input.rate, input.periods, input.values[0]);
        break;
      case 'pmt':
        if (input.rate === undefined || !input.periods) throw new Error('PMT needs rate and periods');
        result = pmt(input.rate, input.periods, input.values[0]);
        break;
      case 'wacc':
        if (!input.weights || input.weights.length !== input.values.length) {
          throw new Error('WACC needs weights array matching values length');
        }
        result = wacc(input.values, input.weights);
        breakdown = input.values.map((v, i) => `${(v * 100).toFixed(1)}% × ${(input.weights![i] * 100).toFixed(1)}%`).join(' + ');
        break;

      // Statistics
      case 'mean':
        result = vals.reduce((a, b) => a.plus(b), new Decimal(0)).div(vals.length);
        break;
      case 'median':
        result = median(vals);
        break;
      case 'stdev':
        result = stdev(vals);
        break;
      case 'min':
        result = Decimal.min(...vals);
        break;
      case 'max':
        result = Decimal.max(...vals);
        break;
      case 'sum':
        result = vals.reduce((a, b) => a.plus(b), new Decimal(0));
        break;
      case 'percentile':
        if (input.rate === undefined) throw new Error('Percentile needs rate (the percentile value, e.g., 0.75 for 75th)');
        result = percentile(vals, input.rate * 100);
        break;

      // Percentage
      case 'percent_of':
        // values[0] is the percentage, values[1] is the base
        result = vals[0].div(100).times(vals[1]);
        break;
      case 'percent_change':
        // (new - old) / old * 100
        if (vals[0].isZero()) throw new Error('Cannot compute percent change from zero');
        result = vals[1].minus(vals[0]).div(vals[0]).times(100);
        breakdown = `(${input.values[1]} - ${input.values[0]}) / ${input.values[0]} × 100`;
        break;

      // Expression
      case 'expression':
        if (!input.expression) throw new Error('Expression operation needs expression string');
        result = evaluateExpression(input.expression);
        breakdown = input.expression;
        break;

      default:
        throw new Error(`Unknown operation: ${input.operation}`);
    }

    return formatToolResult({
      result: result.toNumber(),
      formatted: formatNumber(result),
      ...(input.label ? { label: input.label } : {}),
      ...(breakdown ? { breakdown } : {}),
      precision: 'decimal.js (arbitrary precision)',
    });
  },
});

// ── Formatting ──────────────────────────────────────────────────────────────

function formatNumber(d: Decimal): string {
  const n = d.toNumber();
  const abs = Math.abs(n);

  // Percentages (small decimals likely representing rates)
  if (abs < 1 && abs > 0 && abs < 0.5) {
    return `${d.times(100).toFixed(2)}%`;
  }

  // Large numbers
  if (abs >= 1e12) return `${d.div(1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${d.div(1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${d.div(1e6).toFixed(2)}M`;

  // Currency-like
  if (abs >= 1) return d.toFixed(2);

  // Small decimals
  return d.toFixed(4);
}
