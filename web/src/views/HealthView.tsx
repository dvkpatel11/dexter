import { useEffect, useState } from 'react'
import { intelligence } from '../api/client'

export function HealthView() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [objectives, setObjectives] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      intelligence.alerts(),
      intelligence.objectives(),
    ]).then(([a, o]) => {
      setAlerts(a)
      setObjectives(o)
    }).finally(() => setLoading(false))
  }, [])

  const handleAcknowledge = async (id: string) => {
    await intelligence.acknowledgeAlert(id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
  }

  if (loading) return <div className="loading">Loading health data...</div>

  const unacknowledged = alerts.filter(a => !a.acknowledged)
  const acknowledged = alerts.filter(a => a.acknowledged)

  const severityBadge = (s: string) =>
    s === 'critical' ? 'badge-red' : s === 'warning' ? 'badge-yellow' : 'badge-blue'

  return (
    <div>
      <div className="view-header">
        <h2>Health</h2>
        <p>Portfolio alerts, risk monitoring, and investment objectives</p>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <div className="card stat">
          <div className={`stat-value ${unacknowledged.some(a => a.severity === 'critical') ? 'negative' : ''}`}>
            {unacknowledged.length}
          </div>
          <div className="stat-label">Active Alerts</div>
        </div>
        <div className="card stat">
          <div className="stat-value">
            {alerts.filter(a => a.severity === 'critical').length}
          </div>
          <div className="stat-label">Critical</div>
        </div>
        <div className="card stat">
          <div className="stat-value">{objectives.length}</div>
          <div className="stat-label">Objectives</div>
        </div>
      </div>

      {unacknowledged.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Active Alerts</span>
          </div>
          {unacknowledged.map(a => (
            <div key={a.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <span className={`badge ${severityBadge(a.severity)}`} style={{ marginRight: 8 }}>{a.severity}</span>
                  <strong>{a.title}</strong>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>{a.subject}</span>
                  <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{a.description}</p>
                  {a.suggestedAction && (
                    <p style={{ marginTop: 4, fontSize: 13 }}>Suggested: {a.suggestedAction}</p>
                  )}
                </div>
                <button className="btn" onClick={() => handleAcknowledge(a.id)}>Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {unacknowledged.length === 0 && alerts.length === 0 && objectives.length === 0 && (
        <div className="empty-state">
          <h3>All clear</h3>
          <p>No alerts or objectives configured. Use Chat to set up investment objectives and monitoring.</p>
        </div>
      )}

      {objectives.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <span className="card-title">Investment Objectives</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Risk</th>
                <th>Horizon</th>
                <th>Target</th>
                <th>Primary</th>
              </tr>
            </thead>
            <tbody>
              {objectives.map((o: any) => (
                <tr key={o.id}>
                  <td><strong>{o.name}</strong></td>
                  <td><span className="badge badge-blue">{o.type}</span></td>
                  <td>{o.riskTolerance}</td>
                  <td>{o.timeHorizon}</td>
                  <td>{o.targetAmount ? `$${o.targetAmount.toLocaleString()}` : '-'}{o.targetDate ? ` by ${o.targetDate}` : ''}</td>
                  <td>{o.primary ? 'Yes' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {acknowledged.length > 0 && (
        <div className="card" style={{ marginTop: 16, opacity: 0.6 }}>
          <div className="card-header">
            <span className="card-title">Dismissed Alerts ({acknowledged.length})</span>
          </div>
        </div>
      )}
    </div>
  )
}
