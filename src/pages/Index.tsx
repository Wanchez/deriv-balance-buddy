import { useState, useCallback } from "react";
import { ConnectionPanel } from "@/components/ConnectionPanel";
import { StrategyPanel } from "@/components/StrategyPanel";
import { BotControls } from "@/components/BotControls";
import { TradeLogPanel } from "@/components/TradeLog";
import { DCircles } from "@/components/DCircles";
import { MarketScanner } from "@/components/MarketScanner";
import { Over5Under5Panel } from "@/components/Over5Under5Panel";
import { BlocklyWorkspace } from "@/components/BlocklyWorkspace";
import { useDerivWebSocket } from "@/hooks/useDerivWebSocket";
import { useDCirclesStream } from "@/hooks/useDCirclesStream";
import { useMarketScanner } from "@/hooks/useMarketScanner";
import { BOT_DEFINITIONS } from "@/lib/botStrategies";
import { Bot, Blocks } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BotType } from "@/lib/botStrategies";

const Index = () => {
  const deriv = useDerivWebSocket();
  const [apiToken, setApiToken] = useState<string | null>(null);
  const dCircles = useDCirclesStream(apiToken);
  const scanner = useMarketScanner(apiToken);
  const [activeMainTab, setActiveMainTab] = useState("strategies");

  const handleConnect = useCallback((token: string) => {
    setApiToken(token);
    deriv.connect(token);
  }, [deriv.connect]);

  const handleDisconnect = useCallback(() => {
    deriv.disconnect();
  }, [deriv.disconnect]);

  const handleTokenLoaded = useCallback((token: string) => {
    setApiToken(token);
    deriv.connect(token);
  }, [deriv.connect]);

  const handleTabChange = (botType: string) => {
    if (deriv.isRunning) return;
    const def = BOT_DEFINITIONS.find((b) => b.id === botType);
    if (!def) return;
    deriv.updateStrategy({
      ...deriv.strategy,
      botType: botType as BotType,
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
          {deriv.isConnected && (
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {activeMainTab === "over5under5" ? "Over/Under 5" : BOT_DEFINITIONS.find((b) => b.id === deriv.strategy.botType)?.name}
            </span>
          )}
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Connection */}
        <ConnectionPanel
          isConnected={deriv.isConnected}
          isConnecting={deriv.isConnecting}
          balance={deriv.balance}
          currency={deriv.currency}
          accountName={deriv.accountName}
          loginId={deriv.loginId}
          error={deriv.error}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onTokenLoaded={handleTokenLoaded}
        />

        {/* Market Scanner */}
        <MarketScanner
          alerts={scanner.alerts}
          scanning={scanner.scanning}
          scannedCount={scanner.scannedCount}
          totalSymbols={scanner.totalSymbols}
          onRescan={scanner.rescan}
        />

        {/* D-Circles */}
        <DCircles
          digitHistory={dCircles.digitHistory}
          lastDigit={dCircles.lastDigit}
          currentQuote={dCircles.currentQuote}
          isStreaming={dCircles.isStreaming}
          isLoadingHistory={dCircles.isLoadingHistory}
          symbol={dCircles.symbol}
          historyCount={dCircles.historyCount}
          onSymbolChange={dCircles.changeSymbol}
          onHistoryCountChange={dCircles.changeHistoryCount}
        />

        {/* Main Tabs: Strategies vs Over5/Under5 */}
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
          <TabsList className="w-full flex h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="strategies" className="flex-1 text-xs py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Bot Strategies
            </TabsTrigger>
            <TabsTrigger value="over5under5" className="flex-1 text-xs py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Over/Under 5
            </TabsTrigger>
          </TabsList>

          <TabsContent value="strategies" className="mt-4">
            <Tabs value={deriv.strategy.botType} onValueChange={handleTabChange}>
              <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {BOT_DEFINITIONS.map((bot) => (
                  <TabsTrigger
                    key={bot.id}
                    value={bot.id}
                    disabled={deriv.isRunning && deriv.strategy.botType !== bot.id}
                    className="flex-1 min-w-[120px] text-xs py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {bot.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {BOT_DEFINITIONS.map((bot) => (
                <TabsContent key={bot.id} value={bot.id} className="mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-4 space-y-5">
                      <div className="rounded-lg border border-border bg-card p-4">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {bot.description}
                        </p>
                      </div>
                      <StrategyPanel
                        strategy={deriv.strategy}
                        onUpdate={deriv.updateStrategy}
                        disabled={deriv.isRunning}
                      />
                    </div>
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
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          <TabsContent value="over5under5" className="mt-4">
            <Over5Under5Panel apiToken={apiToken} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
