import { useEffect, useState } from 'react'
import { intelligence } from '../api/client'

const directionBadge = (d: string) =>
  d === 'long' ? 'badge-green' : d === 'short' ? 'badge-red' : 'badge-neutral'

const convictionBadge = (c: string) =>
  c === 'high' ? 'badge-green' : c === 'medium' ? 'badge-yellow' : 'badge-neutral'

export function SignalsView() {
  const [signals, setSignals] = useState<any[]>([])
  const [analyses, setAnalyses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      intelligence.signals(),
      intelligence.analyses(),
    ]).then(([s, a]) => {
      setSignals(s)
      setAnalyses(a)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading signals...</div>

  return (
    <div>
      <div className="view-header">
        <h2>Signals</h2>
        <p>Research-driven directional views from Dexter's analysis skills</p>
      </div>

      {signals.length === 0 && analyses.length === 0 ? (
        <div className="empty-state">
          <h3>No signals yet</h3>
          <p>Use the Chat to run analysis — DCF, comps, technical — and signals will appear here.</p>
        </div>
      ) : (
        <>
          {signals.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Active Signals</span>
                <span className="badge badge-blue">{signals.filter(s => s.status === 'active').length} active</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Direction</th>
                    <th>Conviction</th>
                    <th>Timeframe</th>
                    <th>Thesis</th>
                    <th>Source</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.map((s: any) => (
                    <tr key={s.id}>
                      <td><strong>{s.symbol}</strong></td>
                      <td><span className={`badge ${directionBadge(s.direction)}`}>{s.direction}</span></td>
                      <td><span className={`badge ${convictionBadge(s.conviction)}`}>{s.conviction}</span></td>
                      <td>{s.timeframe}</td>
                      <td style={{ maxWidth: 300 }}>{s.thesis}</td>
                      <td><span className="badge badge-neutral">{s.source}</span></td>
                      <td><span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-neutral'}`}>{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {analyses.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Recent Analyses</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Type</th>
                    <th>Summary</th>
                    <th>Confidence</th>
                    <th>Source</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((a: any) => (
                    <tr key={a.id}>
                      <td><strong>{a.subject}</strong></td>
                      <td><span className="badge badge-blue">{a.type}</span></td>
                      <td style={{ maxWidth: 400 }}>{a.summary}</td>
                      <td><span className={`badge ${convictionBadge(a.confidence)}`}>{a.confidence}</span></td>
                      <td><span className="badge badge-neutral">{a.source}</span></td>
                      <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
