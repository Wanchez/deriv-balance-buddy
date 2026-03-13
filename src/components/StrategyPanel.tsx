import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StrategyConfig } from "@/hooks/useDerivWebSocket";
import { BOT_DEFINITIONS, VOLATILITY_SYMBOLS, type BotType, getBotDefinition } from "@/lib/botStrategies";

interface StrategyPanelProps {
  strategy: StrategyConfig;
  onUpdate: (strategy: StrategyConfig) => void;
  disabled: boolean;
}

export function StrategyPanel({ strategy, onUpdate, disabled }: StrategyPanelProps) {
  const update = (key: keyof StrategyConfig, value: string) => {
    if (key === "entryDigits") {
      const digits = value.split(",").map(v => parseInt(v.trim(), 10)).filter(n => !isNaN(n));
      onUpdate({ ...strategy, entryDigits: digits });
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onUpdate({ ...strategy, [key]: num });
    }
  };

  const handleBotChange = (botType: BotType) => {
    const def = getBotDefinition(botType);
    onUpdate({
      ...strategy,
      botType,
      symbol: def.defaultSymbol,
      initialStake: def.defaults.stake,
      martingale: def.defaults.martingale,
      takeProfit: def.defaults.takeProfit,
      stopLoss: def.defaults.stopLoss,
      overPrediction: def.defaults.prediction,
      entryDigits: def.defaults.entryDigits,
      consecutiveCount: def.defaults.consecutiveCount,
    });
  };

  const currentBot = getBotDefinition(strategy.botType);
  const isEvenOdd = currentBot.tradeType === "evenodd";
  const isOverUnder = currentBot.tradeType === "overunder";
  const showEntryDigits = strategy.botType === "over_under_cycle";
  const showConsecutiveCount = strategy.botType === "even_odd_reversal";

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-lg font-semibold">Settings</h2>
        <span className="text-[10px] uppercase tracking-widest bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
          {currentBot.name}
        </span>
      </div>

      {/* Market type indicator */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-medium ${
          isEvenOdd
            ? "bg-primary/15 text-primary border border-primary/30"
            : "bg-accent/15 text-accent border border-accent/30"
        }`}>
          {isEvenOdd ? "Even / Odd" : "Over / Under"}
        </span>
      </div>

      {/* Symbol Selector */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Market / Volatility</Label>
        <Select
          value={strategy.symbol}
          onValueChange={(v) => onUpdate({ ...strategy, symbol: v })}
          disabled={disabled}
        >
          <SelectTrigger className="bg-muted text-sm h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOLATILITY_SYMBOLS.map((sym) => (
              <SelectItem key={sym.value} value={sym.value}>
                {sym.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Core numeric fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Initial Stake</Label>
          <Input
            type="number"
            value={strategy.initialStake}
            onChange={(e) => update("initialStake", e.target.value)}
            disabled={disabled}
            className="bg-muted font-mono text-sm h-9"
            step={0.01}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Martingale ×</Label>
          <Input
            type="number"
            value={strategy.martingale}
            onChange={(e) => update("martingale", e.target.value)}
            disabled={disabled}
            className="bg-muted font-mono text-sm h-9"
            step={0.1}
          />
        </div>

        {/* Over/Under prediction fields - only for overunder bots */}
        {isOverUnder && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Over Prediction</Label>
              <Input
                type="number"
                value={strategy.overPrediction}
                onChange={(e) => update("overPrediction", e.target.value)}
                disabled={disabled}
                className="bg-muted font-mono text-sm h-9"
                min={0}
                max={9}
                step={1}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Under Prediction</Label>
              <Input
                type="number"
                value={strategy.underPrediction}
                onChange={(e) => update("underPrediction", e.target.value)}
                disabled={disabled}
                className="bg-muted font-mono text-sm h-9"
                min={0}
                max={9}
                step={1}
              />
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Take Profit</Label>
          <Input
            type="number"
            value={strategy.takeProfit}
            onChange={(e) => update("takeProfit", e.target.value)}
            disabled={disabled}
            className="bg-muted font-mono text-sm h-9"
            step={0.01}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Stop Loss</Label>
          <Input
            type="number"
            value={strategy.stopLoss}
            onChange={(e) => update("stopLoss", e.target.value)}
            disabled={disabled}
            className="bg-muted font-mono text-sm h-9"
            step={0.01}
          />
        </div>
      </div>

      {/* Conditional fields */}
      {showEntryDigits && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Entry Digits (comma-separated)</Label>
          <Input
            type="text"
            value={strategy.entryDigits.join(", ")}
            onChange={(e) => update("entryDigits", e.target.value)}
            disabled={disabled}
            className="bg-muted font-mono text-sm h-9"
          />
        </div>
      )}

      {showConsecutiveCount && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Consecutive Digits to Check</Label>
          <Input
            type="number"
            value={strategy.consecutiveCount}
            onChange={(e) => update("consecutiveCount", e.target.value)}
            disabled={disabled}
            className="bg-muted font-mono text-sm h-9"
            min={2}
            max={8}
            step={1}
          />
        </div>
      )}

      <div className="text-[10px] text-muted-foreground bg-muted/50 rounded-md p-2.5 space-y-1">
        <p>• Market: {VOLATILITY_SYMBOLS.find((s) => s.value === strategy.symbol)?.label || strategy.symbol}</p>
        <p>• Type: {isEvenOdd ? "Even / Odd" : "Over / Under"}</p>
        <p>• Strategy: {currentBot.name}</p>
        {showEntryDigits && <p>• Entry digits: {strategy.entryDigits.join(", ")}</p>}
        {showConsecutiveCount && <p>• Checks last {strategy.consecutiveCount} digits for pattern</p>}
      </div>
    </div>
  );
}
