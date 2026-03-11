import { ConnectionPanel } from "@/components/ConnectionPanel";
import { StrategyPanel } from "@/components/StrategyPanel";
import { BotControls } from "@/components/BotControls";
import { TradeLogPanel } from "@/components/TradeLog";
import { useDerivWebSocket } from "@/hooks/useDerivWebSocket";
import { Bot } from "lucide-react";

const Index = () => {
  const deriv = useDerivWebSocket();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2.5">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="font-display text-lg font-bold tracking-tight">
              Deriv <span className="text-primary">AutoTrader</span>
            </h1>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground bg-muted px-3 py-1 rounded-full">
            Over / Under Bot
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left column */}
          <div className="lg:col-span-4 space-y-5">
            <ConnectionPanel
              isConnected={deriv.isConnected}
              isConnecting={deriv.isConnecting}
              balance={deriv.balance}
              currency={deriv.currency}
              accountName={deriv.accountName}
              loginId={deriv.loginId}
              error={deriv.error}
              onConnect={deriv.connect}
              onDisconnect={deriv.disconnect}
            />
            <StrategyPanel
              strategy={deriv.strategy}
              onUpdate={deriv.updateStrategy}
              disabled={deriv.isRunning}
            />
          </div>

          {/* Right column */}
          <div className="lg:col-span-8 space-y-5">
            <BotControls
              isConnected={deriv.isConnected}
              isRunning={deriv.isRunning}
              totalProfit={deriv.totalProfit}
              tradeCount={deriv.trades.filter((t) => t.result !== "pending").length}
              botStatus={deriv.botStatus}
              currentDigit={deriv.currentDigit}
              onStart={deriv.startBot}
              onStop={deriv.stopBot}
            />
            <TradeLogPanel trades={deriv.trades} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
