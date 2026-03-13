import { useMemo } from "react";

interface DCirclesProps {
  digitHistory: number[];
  lastDigit: number | null;
}

export function DCircles({ digitHistory, lastDigit }: DCirclesProps) {
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

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold font-display">D-Circles</h3>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
          {digitHistory.length} ticks
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {stats.map(({ digit, count, percentage }) => {
          const intensity = maxPercentage > 0 ? percentage / maxPercentage : 0;
          const isActive = lastDigit === digit;
          const isHot = percentage > 12;
          const isCold = percentage < 8 && digitHistory.length > 20;

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
                  ${isHot
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : isCold
                      ? "bg-destructive/15 text-destructive border border-destructive/30"
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
                {/* Intensity ring */}
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90"
                  viewBox="0 0 40 40"
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    fill="none"
                    stroke={isHot ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border))"}
                    strokeWidth="2"
                    strokeDasharray={`${intensity * 113} 113`}
                    className="transition-all duration-500"
                  />
                </svg>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {percentage.toFixed(1)}%
              </span>
              <span className="text-[9px] text-muted-foreground/60">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Even/Odd summary */}
      {digitHistory.length > 0 && (
        <div className="flex gap-2 pt-1">
          <div className="flex-1 rounded bg-muted px-2 py-1.5 text-center">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Even</p>
            <p className="text-xs font-bold font-display text-foreground">
              {(
                (stats.filter((s) => s.digit % 2 === 0).reduce((a, b) => a + b.count, 0) /
                  digitHistory.length) *
                100
              ).toFixed(1)}%
            </p>
          </div>
          <div className="flex-1 rounded bg-muted px-2 py-1.5 text-center">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Odd</p>
            <p className="text-xs font-bold font-display text-foreground">
              {(
                (stats.filter((s) => s.digit % 2 !== 0).reduce((a, b) => a + b.count, 0) /
                  digitHistory.length) *
                100
              ).toFixed(1)}%
            </p>
          </div>
          <div className="flex-1 rounded bg-muted px-2 py-1.5 text-center">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Over 4</p>
            <p className="text-xs font-bold font-display text-foreground">
              {(
                (stats.filter((s) => s.digit > 4).reduce((a, b) => a + b.count, 0) /
                  digitHistory.length) *
                100
              ).toFixed(1)}%
            </p>
          </div>
          <div className="flex-1 rounded bg-muted px-2 py-1.5 text-center">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Under 5</p>
            <p className="text-xs font-bold font-display text-foreground">
              {(
                (stats.filter((s) => s.digit < 5).reduce((a, b) => a + b.count, 0) /
                  digitHistory.length) *
                100
              ).toFixed(1)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
