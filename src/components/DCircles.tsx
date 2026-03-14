import { useMemo } from "react";
import { VOLATILITY_SYMBOLS } from "@/lib/botStrategies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface DCirclesProps {
  digitHistory: number[];
  lastDigit: number | null;
  currentQuote: string | null;
  isStreaming: boolean;
  isLoadingHistory: boolean;
  symbol: string;
  historyCount: number;
  onSymbolChange: (symbol: string) => void;
  onHistoryCountChange: (count: number) => void;
}

const PRESET_COUNTS = [50, 200, 500, 1000];

export function DCircles({
  digitHistory,
  lastDigit,
  currentQuote,
  isStreaming,
  isLoadingHistory,
  symbol,
  historyCount,
  onSymbolChange,
  onHistoryCountChange,
}: DCirclesProps) {
  const stats = useMemo(() => {
    const total = digitHistory.length;
    const counts = Array(10).fill(0);
    digitHistory.forEach((d) => counts[d]++);
    return counts.map((count, digit) => ({
      digit,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }, [digitHistory]);

  const maxPercentage = Math.max(...stats.map((s) => s.percentage), 1);
  const minPercentage = Math.min(...stats.map((s) => s.percentage));
  const maxCount = Math.max(...stats.map((s) => s.count), 1);

  // Find the most and least appearing digits
  const mostAppearing = stats.reduce((a, b) => (b.count > a.count ? b : a), stats[0]);
  const leastAppearing = stats.reduce((a, b) => (b.count < a.count && digitHistory.length > 0 ? b : a), stats[0]);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header with symbol selector */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold font-display">D-Circles</h3>
          {isStreaming && (
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
          {isLoadingHistory && (
            <span className="text-[10px] text-muted-foreground animate-pulse">Loading history…</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {digitHistory.length} ticks
          </span>
          {/* History count presets */}
          <div className="flex items-center gap-1">
            {PRESET_COUNTS.map((c) => (
              <button
                key={c}
                onClick={() => onHistoryCountChange(c)}
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                  historyCount === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {c}
              </button>
            ))}
            <Input
              type="number"
              min={10}
              max={5000}
              value={historyCount}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (v >= 10) onHistoryCountChange(v);
              }}
              className="w-16 h-6 text-[10px] text-center bg-muted"
            />
          </div>
          <Select value={symbol} onValueChange={onSymbolChange}>
            <SelectTrigger className="w-[140px] h-7 text-xs bg-muted">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOLATILITY_SYMBOLS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Current price */}
      {currentQuote && (
        <div className="text-center">
          <span className="font-mono text-lg font-bold text-foreground">
            {currentQuote.slice(0, -1)}
          </span>
          <span className="font-mono text-2xl font-black text-red-500">
            {currentQuote.slice(-1)}
          </span>
        </div>
      )}

      {/* Digit circles */}
      <div className="grid grid-cols-5 gap-2">
        {stats.map(({ digit, count, percentage }) => {
          const intensity = maxPercentage > 0 ? percentage / maxPercentage : 0;
          const isActive = lastDigit === digit;
          const isMost = digitHistory.length > 10 && count === mostAppearing.count && count > 0;
          const isLeast = digitHistory.length > 10 && count === leastAppearing.count && percentage < maxPercentage;

          return (
            <div key={digit} className="flex flex-col items-center gap-1">
              <div
                className={`
                  relative w-10 h-10 rounded-full flex items-center justify-center
                  font-display font-bold text-sm transition-all duration-300
                  ${isActive
                    ? "ring-2 ring-primary ring-offset-1 ring-offset-background scale-110"
                    : ""
                  }
                  ${isMost
                    ? "bg-green-500/20 text-green-400 border border-green-500/40"
                    : isLeast
                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                      : "bg-muted text-foreground border border-border"
                  }
                `}
                style={{
                  boxShadow: isActive
                    ? `0 0 12px hsl(var(--primary) / ${0.3 + intensity * 0.4})`
                    : undefined,
                }}
              >
                {digit}
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90"
                  viewBox="0 0 40 40"
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    fill="none"
                    stroke={isMost ? "rgba(34,197,94,0.4)" : isLeast ? "rgba(239,68,68,0.4)" : "hsl(var(--border))"}
                    strokeWidth="2"
                    strokeDasharray={`${intensity * 113} 113`}
                    className="transition-all duration-500"
                  />
                </svg>
              </div>
              <span className={`text-[10px] font-mono ${isMost ? "text-green-400" : isLeast ? "text-red-400" : "text-muted-foreground"}`}>
                {percentage.toFixed(1)}%
              </span>
              <span className="text-[9px] text-muted-foreground/60">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Frequency bars */}
      {digitHistory.length > 0 && (
        <div className="space-y-1 pt-1">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Frequency</p>
          <div className="space-y-0.5">
            {stats.map(({ digit, count, percentage }) => {
              const isMost = count === mostAppearing.count && count > 0;
              const isLeast = count === leastAppearing.count && percentage < maxPercentage;
              const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

              return (
                <div key={digit} className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground w-3 text-right">{digit}</span>
                  <div className="flex-1 h-3 bg-muted rounded-sm overflow-hidden">
                    <div
                      className={`h-full rounded-sm transition-all duration-500 ${
                        isMost ? "bg-green-500/70" : isLeast ? "bg-red-500/70" : "bg-primary/40"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className={`text-[9px] font-mono w-10 text-right ${
                    isMost ? "text-green-400" : isLeast ? "text-red-400" : "text-muted-foreground"
                  }`}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Even/Odd continuous sequence */}
      {digitHistory.length > 0 && (
        <div className="space-y-1 pt-1">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Even / Odd Stream</p>
          <div className="flex flex-wrap">
            {digitHistory.slice(-200).map((d, i) => {
              const isEven = d % 2 === 0;
              return (
                <span
                  key={i}
                  className={`text-[10px] font-mono font-bold ${
                    isEven ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {isEven ? "E" : "O"}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Even/Odd/Over/Under summary */}
      {digitHistory.length > 0 && (
        <div className="grid grid-cols-4 gap-2 pt-1">
          {[
            { label: "Even", filter: (d: number) => d % 2 === 0 },
            { label: "Odd", filter: (d: number) => d % 2 !== 0 },
            { label: "Over 4", filter: (d: number) => d > 4 },
            { label: "Under 5", filter: (d: number) => d < 5 },
          ].map(({ label, filter }) => (
            <div key={label} className="rounded bg-muted px-2 py-1.5 text-center">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className="text-xs font-bold font-display text-foreground">
                {(
                  (stats.filter((s) => filter(s.digit)).reduce((a, b) => a + b.count, 0) /
                    digitHistory.length) *
                  100
                ).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      )}

      {!isStreaming && digitHistory.length === 0 && !isLoadingHistory && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Connect to start live digit analysis
        </p>
      )}
    </div>
  );
}
