import { useOver5Under5, type Over5Config, type VirtualTrade } from "@/hooks/useOver5Under5";
import { VOLATILITY_SYMBOLS } from "@/lib/botStrategies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Square, RefreshCw } from "lucide-react";

interface Over5Under5PanelProps {
  apiToken: string | null;
}

export function Over5Under5Panel({ apiToken }: Over5Under5PanelProps) {
  const bot = useOver5Under5(apiToken);
  const c = bot.config;

  const update = (partial: Partial<Over5Config>) => {
    bot.updateConfig({ ...c, ...partial });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Config */}
        <div className="lg:col-span-5 space-y-4">
          {/* Market & Stake */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Market</Label>
                <Select value={c.symbol} onValueChange={(v) => update({ symbol: v })} disabled={bot.isRunning}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOLATILITY_SYMBOLS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Stake (USD)</Label>
                <Input
                  type="number" step="0.01" min={0.01}
                  value={c.stake} onChange={(e) => update({ stake: parseFloat(e.target.value) || 0.01 })}
                  className="h-8 text-xs mt-1" disabled={bot.isRunning}
                />
              </div>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Martingale</Label>
              <Input
                type="number" step="0.1" min={1}
                value={c.martingale} onChange={(e) => update({ martingale: parseFloat(e.target.value) || 2 })}
                className="h-8 text-xs mt-1" disabled={bot.isRunning}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Take Profit (USD)</Label>
                <Input
                  type="number" step="0.1" min={0.1}
                  value={c.takeProfit} onChange={(e) => update({ takeProfit: parseFloat(e.target.value) || 1 })}
                  className="h-8 text-xs mt-1" disabled={bot.isRunning}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Stop Loss Mode</Label>
                <Select value={c.stopLossMode} onValueChange={(v: "amount" | "losses") => update({ stopLossMode: v })} disabled={bot.isRunning}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount" className="text-xs">Amount (USD)</SelectItem>
                    <SelectItem value="losses" className="text-xs">Number of Losses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {c.stopLossMode === "amount" ? (
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Stop Loss Amount (USD)</Label>
                <Input
                  type="number" step="0.1" min={0.1}
                  value={c.stopLossAmount} onChange={(e) => update({ stopLossAmount: parseFloat(e.target.value) || 1 })}
                  className="h-8 text-xs mt-1" disabled={bot.isRunning}
                />
              </div>
            ) : (
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Max Number of Losses</Label>
                <Input
                  type="number" step="1" min={1}
                  value={c.maxLosses} onChange={(e) => update({ maxLosses: parseInt(e.target.value) || 9 })}
                  className="h-8 text-xs mt-1" disabled={bot.isRunning}
                />
              </div>
            )}

            {/* Start Button */}
            <Button
              onClick={bot.isRunning ? bot.stop : bot.start}
              className={`w-full h-10 font-bold text-sm ${
                bot.isRunning
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
              disabled={!apiToken}
            >
              {bot.isRunning ? (
                <><Square className="w-4 h-4 mr-2" /> Stop</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Start Auto</>
              )}
            </Button>
          </div>

          {/* Main Strategy */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Main Strategy</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Direction</Label>
                <div className="flex mt-1 rounded overflow-hidden border border-border">
                  <button
                    onClick={() => update({ direction: "over" })}
                    className={`flex-1 py-1.5 text-xs font-bold transition-colors ${
                      c.direction === "over" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                    disabled={bot.isRunning}
                  >Over</button>
                  <button
                    onClick={() => update({ direction: "under" })}
                    className={`flex-1 py-1.5 text-xs font-bold transition-colors ${
                      c.direction === "under" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                    disabled={bot.isRunning}
                  >Under</button>
                </div>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Barrier</Label>
                <Input
                  type="number" min={0} max={9}
                  value={c.barrier} onChange={(e) => update({ barrier: parseInt(e.target.value) || 5 })}
                  className="h-8 text-xs mt-1 bg-card font-bold" disabled={bot.isRunning}
                />
              </div>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Virtual Entry Trigger</Label>
              <div className="flex mt-1 rounded overflow-hidden border border-border">
                <button
                  onClick={() => update({ virtualEntryTrigger: "losses" })}
                  className={`flex-1 py-1.5 text-xs font-bold transition-colors ${
                    c.virtualEntryTrigger === "losses" ? "bg-red-500/80 text-white" : "bg-muted text-muted-foreground"
                  }`}
                  disabled={bot.isRunning}
                >Losses</button>
                <button
                  onClick={() => update({ virtualEntryTrigger: "wins" })}
                  className={`flex-1 py-1.5 text-xs font-bold transition-colors ${
                    c.virtualEntryTrigger === "wins" ? "bg-green-500/80 text-white" : "bg-muted text-muted-foreground"
                  }`}
                  disabled={bot.isRunning}
                >Wins</button>
              </div>
            </div>

            <Input
              type="number" min={1} max={20}
              value={c.virtualEntryCount} onChange={(e) => update({ virtualEntryCount: parseInt(e.target.value) || 4 })}
              className="h-8 text-xs font-bold" disabled={bot.isRunning}
            />
          </div>

          {/* Recovery Market (placeholder) */}
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Recovery Market (OFF)</span>
              <Button variant="outline" size="sm" className="h-6 text-[10px]" disabled>Enable</Button>
            </div>
          </div>

          {/* Mode */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Mode</p>
            <div className="flex rounded overflow-hidden border border-border">
              <button
                onClick={() => update({ mode: "normal" })}
                className={`flex-1 py-2 text-xs font-bold transition-colors ${
                  c.mode === "normal" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
                disabled={bot.isRunning}
              >Normal</button>
              <button
                onClick={() => update({ mode: "turbo" })}
                className={`flex-1 py-2 text-xs font-bold transition-colors ${
                  c.mode === "turbo" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
                disabled={bot.isRunning}
              >Turbo</button>
            </div>
          </div>
        </div>

        {/* Right: Live display */}
        <div className="lg:col-span-7 space-y-4">
          {/* Virtual Mode Display */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">
                Virtual Mode — {c.direction === "over" ? "Over" : "Under"} {c.barrier}
              </p>
              <span className="text-xs font-mono font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded">
                L: {bot.virtualCount}/{c.virtualEntryCount}
              </span>
            </div>
          </div>

          {/* Current Digit Display */}
          <div className="rounded-lg border border-border bg-card/80 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground">
                {VOLATILITY_SYMBOLS.find((s) => s.value === c.symbol)?.label}
              </span>
              <span className="text-xs text-muted-foreground uppercase">
                {c.direction === "over" ? "OVER" : "UNDER"} {c.barrier}
              </span>
            </div>
            <div className="flex justify-center">
              {bot.currentDigit !== null ? (
                <span className={`text-5xl font-black font-mono rounded-lg px-6 py-3 ${
                  (c.direction === "over" ? bot.currentDigit > c.barrier : bot.currentDigit < c.barrier)
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {bot.currentDigit}
                </span>
              ) : (
                <span className="text-3xl text-muted-foreground">—</span>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Statistics</p>
              <Button variant="ghost" size="sm" className="h-6 px-2" onClick={bot.fetchStats}>
                <RefreshCw className="w-3 h-3 mr-1" />
                <span className="text-[10px]">Refresh</span>
              </Button>
            </div>
            {bot.stats.length > 0 && bot.stats.map((s, i) => (
              <div key={bot.STAT_BUCKETS[i]} className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{bot.STAT_BUCKETS[i]} ticks</span>
                  <span className="font-mono">{s.tickCount} actual</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] w-12 text-green-400">Over {c.barrier}:</span>
                    <div className="flex-1 h-3 bg-muted rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-green-500/70 rounded-sm transition-all"
                        style={{ width: `${s.overPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-green-400 w-24 text-right">
                      {s.overPct.toFixed(1)}% ({s.overCount}/{s.tickCount})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] w-12 text-red-400">Under {c.barrier}:</span>
                    <div className="flex-1 h-3 bg-muted rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-red-500/70 rounded-sm transition-all"
                        style={{ width: `${s.underPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-red-400 w-24 text-right">
                      {s.underPct.toFixed(1)}% ({s.underCount}/{s.tickCount})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bot Status */}
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">{bot.botStatus || "Idle"}</span>
              <div className="flex gap-3 text-xs">
                <span className={`font-bold ${bot.totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  P/L: ${bot.totalProfit.toFixed(2)}
                </span>
                <span className="text-muted-foreground">Losses: {bot.realLossCount}</span>
              </div>
            </div>
          </div>

          {/* Trade Log */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Trades ({bot.trades.filter(t => !t.isVirtual).length} real / {bot.trades.filter(t => t.isVirtual).length} virtual)
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {bot.trades.slice(0, 50).map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between px-2 py-1 rounded text-[10px] font-mono ${
                    t.isVirtual ? "bg-muted/30 opacity-60" : "bg-muted/60"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {t.isVirtual && <span className="text-muted-foreground">🔮</span>}
                    {!t.isVirtual && <span>💰</span>}
                    <span>{t.type} {t.barrier}</span>
                    <span className="text-muted-foreground">d:{t.entryDigit}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {!t.isVirtual && t.stake > 0 && (
                      <span className="text-muted-foreground">${t.stake.toFixed(2)}</span>
                    )}
                    <span className={
                      t.result === "win" || t.result === "virtual_win"
                        ? "text-green-400 font-bold"
                        : t.result === "loss" || t.result === "virtual_loss"
                          ? "text-red-400 font-bold"
                          : "text-yellow-400"
                    }>
                      {t.result === "virtual_win" ? "+Demo Win" :
                       t.result === "virtual_loss" ? "-Demo Loss" :
                       t.result === "win" ? `+$${t.profit.toFixed(2)}` :
                       t.result === "loss" ? `-$${Math.abs(t.profit).toFixed(2)}` :
                       "Pending..."}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
