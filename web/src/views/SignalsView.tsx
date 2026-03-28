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

const directionVariant = (d: string) => (d === "long" ? "green" as const : d === "short" ? "red" as const : "neutral" as const);
const convictionVariant = (c: string) => (c === "high" ? "green" as const : c === "medium" ? "yellow" as const : "neutral" as const);

export function SignalsView() {
  const [signals, setSignals] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([intelligence.signals(), intelligence.analyses()])
      .then(([s, a]) => { setSignals(s); setAnalyses(a); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-10 text-muted-foreground">Loading signals...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">Signals</h2>
        <p className="text-sm text-muted-foreground mt-1">Research-driven directional views from Dexter's analysis skills</p>
      </div>

      {signals.length === 0 && analyses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <h3 className="text-foreground font-semibold mb-2">No signals yet</h3>
          <p className="text-sm">Use the Chat to run analysis — DCF, comps, technical — and signals will appear here.</p>
        </div>
      ) : (
        <>
          {signals.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Active Signals</h3>
                <Badge variant="blue">{signals.filter((s) => s.status === "active").length} active</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Symbol", "Direction", "Conviction", "Timeframe", "Thesis", "Source", "Status"].map((h) => (
                        <th key={h} className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {signals.map((s: any) => (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="py-2.5 px-3 font-semibold">{s.symbol}</td>
                        <td className="py-2.5 px-3"><Badge variant={directionVariant(s.direction)}>{s.direction}</Badge></td>
                        <td className="py-2.5 px-3"><Badge variant={convictionVariant(s.conviction)}>{s.conviction}</Badge></td>
                        <td className="py-2.5 px-3">{s.timeframe}</td>
                        <td className="py-2.5 px-3 max-w-[300px] truncate">{s.thesis}</td>
                        <td className="py-2.5 px-3"><Badge variant="neutral">{s.source}</Badge></td>
                        <td className="py-2.5 px-3"><Badge variant={s.status === "active" ? "green" : "neutral"}>{s.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {analyses.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold mb-4">Recent Analyses</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Subject", "Type", "Summary", "Confidence", "Source", "Date"].map((h) => (
                        <th key={h} className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analyses.map((a: any) => (
                      <tr key={a.id} className="border-b border-border/50">
                        <td className="py-2.5 px-3 font-semibold">{a.subject}</td>
                        <td className="py-2.5 px-3"><Badge variant="blue">{a.type}</Badge></td>
                        <td className="py-2.5 px-3 max-w-[400px] truncate">{a.summary}</td>
                        <td className="py-2.5 px-3"><Badge variant={convictionVariant(a.confidence)}>{a.confidence}</Badge></td>
                        <td className="py-2.5 px-3"><Badge variant="neutral">{a.source}</Badge></td>
                        <td className="py-2.5 px-3 tabular-nums">{new Date(a.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
