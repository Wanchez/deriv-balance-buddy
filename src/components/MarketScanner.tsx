import type { MarketAlert } from "@/hooks/useMarketScanner";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface MarketScannerProps {
  alerts: MarketAlert[];
  scanning: boolean;
  scannedCount: number;
  totalSymbols: number;
  onRescan: () => void;
}

export function MarketScanner({
  alerts,
  scanning,
  scannedCount,
  totalSymbols,
  onRescan,
}: MarketScannerProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold font-display">Market Scanner</h3>
          {scanning && (
            <span className="text-[10px] text-muted-foreground animate-pulse">
              Scanning {scannedCount}/{totalSymbols}…
            </span>
          )}
        </div>
        <button
          onClick={onRescan}
          disabled={scanning}
          className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${scanning ? "animate-spin" : ""}`} />
        </button>
      </div>

      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
        Digits below 10.5% threshold · Last {totalSymbols} markets · Auto-refreshes every 60s
      </p>

      {!scanning && alerts.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No cold-digit patterns detected right now
        </p>
      )}

      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.map((alert, i) => (
            <div
              key={`${alert.symbol}-${alert.pattern}-${i}`}
              className="rounded bg-muted px-3 py-2 flex items-center justify-between gap-2 flex-wrap"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{alert.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-medium">
                  {alert.pattern}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {alert.digits.map((d) => (
                  <span
                    key={d}
                    className="text-[10px] font-mono bg-destructive/10 text-destructive px-1.5 py-0.5 rounded"
                  >
                    {d}: {alert.percentages[d].toFixed(1)}%
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
