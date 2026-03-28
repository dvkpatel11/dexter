import { useEffect, useState } from 'react'
import { intelligence, portfolio } from '../api/client'

export function TradeView() {
  const [strategies, setStrategies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    intelligence.strategies()
      .then(setStrategies)
      .finally(() => setLoading(false))
  }, [])

  const handleApprove = async (id: string) => {
    await intelligence.updateStrategyStatus(id, 'approved')
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s))
  }

  const handleCancel = async (id: string) => {
    await intelligence.updateStrategyStatus(id, 'cancelled')
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s))
  }

  if (loading) return <div className="loading">Loading strategies...</div>

  const proposed = strategies.filter(s => s.status === 'proposed')
  const active = strategies.filter(s => ['approved', 'partial', 'executed'].includes(s.status))
  const closed = strategies.filter(s => ['closed', 'cancelled'].includes(s.status))

  return (
    <div>
      <div className="view-header">
        <h2>Trade</h2>
        <p>Strategy proposals, execution, and order history</p>
      </div>

      {strategies.length === 0 ? (
        <div className="empty-state">
          <h3>No strategies yet</h3>
          <p>Ask Dexter to analyze a stock and propose a trade. Strategies will appear here for review.</p>
        </div>
      ) : (
        <>
          {proposed.length > 0 && (
            <>
              <h3 style={{ marginBottom: 12 }}>Pending Approval ({proposed.length})</h3>
              {proposed.map(s => (
                <div className="card" key={s.id}>
                  <div className="card-header">
                    <span className="card-title">{s.name}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span className={`badge ${s.executionMode === 'auto' ? 'badge-green' : 'badge-yellow'}`}>
                        {s.executionMode}
                      </span>
                      <span className={`badge ${s.direction === 'long' ? 'badge-green' : s.direction === 'short' ? 'badge-red' : 'badge-neutral'}`}>
                        {s.direction}
                      </span>
                    </div>
                  </div>

                  {s.legs && s.legs.length > 0 && (
                    <table>
                      <thead>
                        <tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Entry</th><th>Target</th><th>Stop</th></tr>
                      </thead>
                      <tbody>
                        {s.legs.map((leg: any, i: number) => (
                          <tr key={i}>
                            <td><strong>{leg.symbol}</strong></td>
                            <td><span className={`badge ${leg.side === 'buy' ? 'badge-green' : 'badge-red'}`}>{leg.side}</span></td>
                            <td>{leg.quantity}</td>
                            <td>${leg.entryPrice?.toFixed(2) ?? '-'}</td>
                            <td className="positive">${leg.targetPrice?.toFixed(2) ?? '-'}</td>
                            <td className="negative">${leg.stopPrice?.toFixed(2) ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {s.risk && (
                    <div className="grid grid-4" style={{ marginTop: 12 }}>
                      <div className="stat">
                        <div className="stat-value negative" style={{ fontSize: 18 }}>${s.risk.maxLoss?.toFixed(0)}</div>
                        <div className="stat-label">Max Loss</div>
                      </div>
                      <div className="stat">
                        <div className="stat-value positive" style={{ fontSize: 18 }}>${s.risk.targetGain?.toFixed(0)}</div>
                        <div className="stat-label">Target Gain</div>
                      </div>
                      <div className="stat">
                        <div className="stat-value" style={{ fontSize: 18 }}>{s.risk.rewardRiskRatio?.toFixed(1)}:1</div>
                        <div className="stat-label">R:R</div>
                      </div>
                      <div className="stat">
                        <div className="stat-value" style={{ fontSize: 18 }}>{s.risk.positionSizePercent?.toFixed(1)}%</div>
                        <div className="stat-label">Position Size</div>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={() => handleApprove(s.id)}>Approve</button>
                    <button className="btn btn-danger" onClick={() => handleCancel(s.id)}>Reject</button>
                  </div>
                </div>
              ))}
            </>
          )}

          {active.length > 0 && (
            <>
              <h3 style={{ marginTop: 24, marginBottom: 12 }}>Active ({active.length})</h3>
              {active.map(s => (
                <div className="card" key={s.id}>
                  <div className="card-header">
                    <span className="card-title">{s.name}</span>
                    <span className="badge badge-green">{s.status}</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {closed.length > 0 && (
            <>
              <h3 style={{ marginTop: 24, marginBottom: 12 }}>History ({closed.length})</h3>
              {closed.map(s => (
                <div className="card" key={s.id} style={{ opacity: 0.6 }}>
                  <div className="card-header">
                    <span className="card-title">{s.name}</span>
                    <span className="badge badge-neutral">{s.status}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  )
}
