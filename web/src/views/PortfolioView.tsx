import { useEffect, useState } from "react";
import { portfolio } from "../api/client";
import { cn } from "../lib/utils";
import { PreviewBanner } from "../components/PreviewBanner";

function fmt(n: number): string {
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function PortfolioView() {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portfolio
      .snapshot()
      .then(setSnapshot)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-10 text-muted-foreground">Loading portfolio...</div>;
  if (error) return (
    <div className="p-6 max-w-6xl mx-auto">
      <PreviewBanner
        title="Portfolio"
        description="Live brokerage data via SnapTrade integration. Connect your accounts to see positions, balances, and P&L."
        requirement="Requires SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY environment variables."
      />
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        {error}
      </div>
    </div>
  );

  const positions = snapshot?.positions ?? [];
  const totalValue = snapshot?.totalValue ?? 0;
  const totalCash = snapshot?.totalCash ?? 0;
  const totalPnl = positions.reduce((s: number, p: any) => s + (p.unrealizedPnl ?? 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PreviewBanner
        title="Portfolio"
        description="Live brokerage data via SnapTrade integration. Connect your accounts to see positions, balances, and P&L."
        requirement="Requires SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY environment variables."
      />
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">Portfolio</h2>
        <p className="text-sm text-muted-foreground mt-1">{snapshot?.accounts?.length ?? 0} accounts connected</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Value", value: fmt(totalValue) },
          { label: `Cash (${totalValue > 0 ? ((totalCash / totalValue) * 100).toFixed(1) : 0}%)`, value: fmt(totalCash) },
          { label: "Unrealized P&L", value: fmt(totalPnl), color: totalPnl >= 0 },
          { label: "Positions", value: positions.length },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5 text-center">
            <div className={cn("text-2xl font-bold tracking-tight", s.color === true && "text-green-500", s.color === false && "text-red-500")}>{s.value}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-base font-semibold mb-4">Holdings</h3>
        {positions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No positions found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Symbol", "Type", "Qty", "Price", "Mkt Value", "Avg Cost", "P&L", "P&L %", "Weight"].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((p: any) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-2.5 px-3 font-semibold">{p.symbol}</td>
                    <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{p.instrumentType}</span></td>
                    <td className="py-2.5 px-3 tabular-nums">{p.quantity}</td>
                    <td className="py-2.5 px-3 tabular-nums">{fmt(p.currentPrice)}</td>
                    <td className="py-2.5 px-3 tabular-nums">{fmt(p.marketValue)}</td>
                    <td className="py-2.5 px-3 tabular-nums">{fmt(p.averageCost)}</td>
                    <td className={cn("py-2.5 px-3 tabular-nums", p.unrealizedPnl >= 0 ? "text-green-500" : "text-red-500")}>{fmt(p.unrealizedPnl)}</td>
                    <td className={cn("py-2.5 px-3 tabular-nums", p.unrealizedPnlPercent >= 0 ? "text-green-500" : "text-red-500")}>{pct(p.unrealizedPnlPercent)}</td>
                    <td className="py-2.5 px-3 tabular-nums">{totalValue > 0 ? ((p.marketValue / totalValue) * 100).toFixed(1) + "%" : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
