import { useEffect, useState } from 'react'
import { portfolio } from '../api/client'

function fmt(n: number): string {
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

function pct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

export function PortfolioView() {
  const [snapshot, setSnapshot] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    portfolio.snapshot()
      .then(setSnapshot)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading portfolio...</div>
  if (error) return <div className="error-message">Failed to load portfolio: {error}. Make sure SnapTrade is configured.</div>

  const positions = snapshot?.positions ?? []
  const totalValue = snapshot?.totalValue ?? 0
  const totalCash = snapshot?.totalCash ?? 0
  const totalPnl = positions.reduce((s: number, p: any) => s + (p.unrealizedPnl ?? 0), 0)

  return (
    <div>
      <div className="view-header">
        <h2>Portfolio</h2>
        <p>{snapshot?.accounts?.length ?? 0} accounts connected</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card stat">
          <div className="stat-value">{fmt(totalValue)}</div>
          <div className="stat-label">Total Value</div>
        </div>
        <div className="card stat">
          <div className="stat-value">{fmt(totalCash)}</div>
          <div className="stat-label">Cash ({totalValue > 0 ? ((totalCash / totalValue) * 100).toFixed(1) : 0}%)</div>
        </div>
        <div className="card stat">
          <div className={`stat-value ${totalPnl >= 0 ? 'positive' : 'negative'}`}>{fmt(totalPnl)}</div>
          <div className="stat-label">Unrealized P&L</div>
        </div>
        <div className="card stat">
          <div className="stat-value">{positions.length}</div>
          <div className="stat-label">Positions</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Holdings</span>
        </div>
        {positions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No positions found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Mkt Value</th>
                <th>Avg Cost</th>
                <th>P&L</th>
                <th>P&L %</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p: any) => (
                <tr key={p.id}>
                  <td><strong>{p.symbol}</strong></td>
                  <td><span className="badge badge-blue">{p.instrumentType}</span></td>
                  <td>{p.quantity}</td>
                  <td>{fmt(p.currentPrice)}</td>
                  <td>{fmt(p.marketValue)}</td>
                  <td>{fmt(p.averageCost)}</td>
                  <td className={p.unrealizedPnl >= 0 ? 'positive' : 'negative'}>{fmt(p.unrealizedPnl)}</td>
                  <td className={p.unrealizedPnlPercent >= 0 ? 'positive' : 'negative'}>{pct(p.unrealizedPnlPercent)}</td>
                  <td>{totalValue > 0 ? ((p.marketValue / totalValue) * 100).toFixed(1) + '%' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
