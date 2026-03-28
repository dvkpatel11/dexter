import { useEffect, useState } from "react";
import { intelligence } from "../api/client";
import { cn } from "../lib/utils";

function Badge({ variant, children }: { variant: "green" | "red" | "yellow" | "blue" | "neutral"; children: React.ReactNode }) {
  const colors = {
    green: "bg-green-500/15 text-green-500",
    red: "bg-red-500/15 text-red-500",
    yellow: "bg-yellow-500/15 text-yellow-500",
    blue: "bg-primary/15 text-primary",
    neutral: "bg-muted text-muted-foreground",
  };
  return <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider", colors[variant])}>{children}</span>;
}

export function HealthView() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([intelligence.alerts(), intelligence.objectives()])
      .then(([a, o]) => { setAlerts(a); setObjectives(o); })
      .finally(() => setLoading(false));
  }, []);

  const handleAcknowledge = async (id: string) => {
    await intelligence.acknowledgeAlert(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  if (loading) return <div className="flex items-center justify-center p-10 text-muted-foreground">Loading health data...</div>;

  const unacknowledged = alerts.filter((a) => !a.acknowledged);
  const acknowledged = alerts.filter((a) => a.acknowledged);
  const severityVariant = (s: string) => (s === "critical" ? "red" as const : s === "warning" ? "yellow" as const : "blue" as const);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">Health</h2>
        <p className="text-sm text-muted-foreground mt-1">Portfolio alerts, risk monitoring, and investment objectives</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <div className={cn("text-2xl font-bold", unacknowledged.some((a) => a.severity === "critical") && "text-red-500")}>{unacknowledged.length}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Active Alerts</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <div className="text-2xl font-bold">{alerts.filter((a) => a.severity === "critical").length}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Critical</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <div className="text-2xl font-bold">{objectives.length}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Objectives</div>
        </div>
      </div>

      {unacknowledged.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 mb-4">
          <h3 className="text-base font-semibold mb-4">Active Alerts</h3>
          {unacknowledged.map((a) => (
            <div key={a.id} className="py-3 border-b border-border/50 last:border-b-0 flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={severityVariant(a.severity)}>{a.severity}</Badge>
                  <span className="font-semibold text-sm">{a.title}</span>
                  <span className="text-muted-foreground text-xs">{a.subject}</span>
                </div>
                <p className="text-sm text-muted-foreground">{a.description}</p>
                {a.suggestedAction && <p className="text-sm mt-1">Suggested: {a.suggestedAction}</p>}
              </div>
              <button onClick={() => handleAcknowledge(a.id)} className="shrink-0 px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-accent transition-colors">Dismiss</button>
            </div>
          ))}
        </div>
      )}

      {unacknowledged.length === 0 && alerts.length === 0 && objectives.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <h3 className="text-foreground font-semibold mb-2">All clear</h3>
          <p className="text-sm">No alerts or objectives configured. Use Chat to set up investment objectives and monitoring.</p>
        </div>
      )}

      {objectives.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 mt-4">
          <h3 className="text-base font-semibold mb-4">Investment Objectives</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Name", "Type", "Risk", "Horizon", "Target", "Primary"].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {objectives.map((o: any) => (
                  <tr key={o.id} className="border-b border-border/50">
                    <td className="py-2.5 px-3 font-semibold">{o.name}</td>
                    <td className="py-2.5 px-3"><Badge variant="blue">{o.type}</Badge></td>
                    <td className="py-2.5 px-3">{o.riskTolerance}</td>
                    <td className="py-2.5 px-3">{o.timeHorizon}</td>
                    <td className="py-2.5 px-3">{o.targetAmount ? `$${o.targetAmount.toLocaleString()}` : "-"}{o.targetDate ? ` by ${o.targetDate}` : ""}</td>
                    <td className="py-2.5 px-3">{o.primary ? "Yes" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {acknowledged.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 mt-4 opacity-60">
          <h3 className="text-base font-semibold">Dismissed Alerts ({acknowledged.length})</h3>
        </div>
      )}
    </div>
  );
}
