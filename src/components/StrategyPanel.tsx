import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StrategyConfig } from "@/hooks/useDerivWebSocket";

interface StrategyPanelProps {
  strategy: StrategyConfig;
  onUpdate: (strategy: StrategyConfig) => void;
  disabled: boolean;
}

export function StrategyPanel({ strategy, onUpdate, disabled }: StrategyPanelProps) {
  const update = (key: keyof StrategyConfig, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onUpdate({ ...strategy, [key]: num });
    }
  };

  const fields: { key: keyof StrategyConfig; label: string }[] = [
    { key: "initialStake", label: "Initial Stake" },
    { key: "martingale", label: "Martingale Multiplier" },
    { key: "overPrediction", label: "Over Prediction" },
    { key: "underPrediction", label: "Under Prediction" },
    { key: "takeProfit", label: "Take Profit" },
    { key: "stopLoss", label: "Stop Loss" },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-lg font-semibold">Strategy Config</h2>
        <span className="text-[10px] uppercase tracking-widest bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
          Over/Under
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input
              type="number"
              value={strategy[key]}
              onChange={(e) => update(key, e.target.value)}
              disabled={disabled}
              className="bg-muted font-mono text-sm h-9"
              step={key === "martingale" ? 0.1 : key.includes("Prediction") ? 1 : 0.01}
            />
          </div>
        ))}
      </div>

      <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-md p-2.5 space-y-1">
        <p>• Market: Volatility 10 (1HZ10V) — Digits</p>
        <p>• On win → reset stake, switch to OVER</p>
        <p>• On loss → martingale × stake, switch to UNDER</p>
      </div>
    </div>
  );
}
