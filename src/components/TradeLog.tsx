import { ScrollArea } from "@/components/ui/scroll-area";
import type { TradeLog as TradeLogType } from "@/hooks/useDerivWebSocket";

interface TradeLogProps {
  trades: TradeLogType[];
}

export function TradeLogPanel({ trades }: TradeLogProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3 flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Trade Log</h2>
        <span className="text-xs text-muted-foreground">{trades.length} trades</span>
      </div>

      <ScrollArea className="h-[360px] pr-2">
        {trades.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No trades yet. Start the bot to begin trading.
          </div>
        ) : (
          <div className="space-y-1.5">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className={`rounded-md border px-3 py-2 text-xs font-mono flex items-center justify-between ${
                  trade.result === "win"
                    ? "border-chart-win/20 bg-chart-win/5"
                    : trade.result === "loss"
                    ? "border-chart-loss/20 bg-chart-loss/5"
                    : "border-border bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`font-semibold ${
                      trade.type === "DIGITOVER" ? "text-chart-win" : "text-accent"
                    }`}
                  >
                    {trade.type === "DIGITOVER" ? "OVER" : "UNDER"}
                  </span>
                  <span className="text-muted-foreground">P:{trade.prediction}</span>
                  <span className="text-muted-foreground">
                    ${trade.stake.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {trade.result !== "pending" && (
                    <span
                      className={`font-semibold ${
                        trade.result === "win" ? "text-chart-win" : "text-chart-loss"
                      }`}
                    >
                      {trade.profit >= 0 ? "+" : ""}
                      {trade.profit.toFixed(2)}
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold ${
                      trade.result === "win"
                        ? "bg-chart-win/20 text-chart-win"
                        : trade.result === "loss"
                        ? "bg-chart-loss/20 text-chart-loss"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {trade.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
