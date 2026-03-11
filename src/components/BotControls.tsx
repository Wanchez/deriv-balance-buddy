import { Button } from "@/components/ui/button";
import { Play, Square, TrendingUp, TrendingDown } from "lucide-react";

interface BotControlsProps {
  isConnected: boolean;
  isRunning: boolean;
  totalProfit: number;
  tradeCount: number;
  botStatus: string;
  currentDigit: string | null;
  onStart: () => void;
  onStop: () => void;
}

export function BotControls({
  isConnected,
  isRunning,
  totalProfit,
  tradeCount,
  botStatus,
  currentDigit,
  onStart,
  onStop,
}: BotControlsProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <h2 className="font-display text-lg font-semibold">Bot Controls</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-muted p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Total P&L
          </p>
          <p
            className={`text-xl font-bold font-display ${
              totalProfit >= 0 ? "text-chart-win" : "text-chart-loss"
            }`}
          >
            {totalProfit >= 0 ? "+" : ""}
            {totalProfit.toFixed(2)}
          </p>
        </div>
        <div className="rounded-md bg-muted p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Trades
          </p>
          <p className="text-xl font-bold font-display">{tradeCount}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1 gap-2"
          onClick={onStart}
          disabled={!isConnected || isRunning}
        >
          <Play className="h-4 w-4" />
          Start Bot
        </Button>
        <Button
          variant="destructive"
          className="flex-1 gap-2"
          onClick={onStop}
          disabled={!isRunning}
        >
          <Square className="h-4 w-4" />
          Stop Bot
        </Button>
      </div>

      {isRunning && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-primary">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            {botStatus || "Bot is running..."}
          </div>
          {currentDigit && (
            <div className="text-xs text-muted-foreground font-mono">
              Last tick: {currentDigit}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
