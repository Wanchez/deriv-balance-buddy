import { useState, useRef, useCallback } from "react";

export interface TradeLog {
  id: number;
  type: "DIGITOVER" | "DIGITUNDER";
  prediction: number;
  stake: number;
  result: "win" | "loss" | "pending";
  profit: number;
  timestamp: Date;
  contractId?: string;
  entryPrice?: string;
  exitPrice?: string;
}

export interface StrategyConfig {
  initialStake: number;
  martingale: number;
  overPrediction: number;
  underPrediction: number;
  takeProfit: number;
  stopLoss: number;
  entryDigits: number[];
}

const DEFAULT_STRATEGY: StrategyConfig = {
  initialStake: 5.97,
  martingale: 2,
  overPrediction: 1,
  underPrediction: 6,
  takeProfit: 5.97,
  stopLoss: 5.97,
  entryDigits: [4, 9],
};

export function useDerivWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [loginId, setLoginId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [trades, setTrades] = useState<TradeLog[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [strategy, setStrategy] = useState<StrategyConfig>(DEFAULT_STRATEGY);
  const [currentDigit, setCurrentDigit] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string>("");
  const runningRef = useRef(false);
  const totalProfitRef = useRef(0);
  const tradeIdRef = useRef(0);
  const strategyRef = useRef(DEFAULT_STRATEGY);

  // Cycle state (mirrors the JS logic)
  const currentStakeRef = useRef(DEFAULT_STRATEGY.initialStake);
  const tradeCountRef = useRef(0);
  const cycleActiveRef = useRef(false);
  const scanningForEntryRef = useRef(true);
  const recoveryActiveRef = useRef(false);
  const contractTypeRef = useRef<"DIGITOVER" | "DIGITUNDER">("DIGITOVER");
  const barrierRef = useRef(1);
  const cycleTradesRef = useRef<{ contractType: string; stake: number; entry: string }[]>([]);

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const addTrade = useCallback((trade: TradeLog) => {
    setTrades((prev) => [trade, ...prev].slice(0, 100));
  }, []);

  const updateTradeResult = useCallback((contractId: string, result: "win" | "loss", profit: number, exitPrice: string) => {
    setTrades((prev) =>
      prev.map((t) =>
        t.contractId === contractId
          ? { ...t, result, profit, exitPrice }
          : t
      )
    );
  }, []);

  // Execute a trade (mirrors executeTrade from JS)
  const executeTrade = useCallback((entryPrice: string) => {
    if (!runningRef.current) return;
    const s = strategyRef.current;
    const cType = contractTypeRef.current;
    const barrier = barrierRef.current;
    const stake = currentStakeRef.current;

    cycleTradesRef.current.push({
      contractType: cType,
      stake,
      entry: entryPrice,
    });

    setBotStatus(`${cType} | Stake ${stake.toFixed(2)}`);

    // Add trade to UI as pending
    tradeIdRef.current += 1;
    const trade: TradeLog = {
      id: tradeIdRef.current,
      type: cType,
      prediction: barrier,
      stake,
      result: "pending",
      profit: 0,
      timestamp: new Date(),
      entryPrice,
    };
    addTrade(trade);

    // Send buy request — NO subscribe here; we subscribe explicitly on buy response
    sendMessage({
      buy: 1,
      price: stake,
      parameters: {
        amount: stake,
        basis: "stake",
        contract_type: cType,
        currency: "USD",
        duration: 1,
        duration_unit: "t",
        symbol: "1HZ10V",
        barrier: barrier,
      },
    });

    if (!recoveryActiveRef.current) {
      tradeCountRef.current += 1;
    }
  }, [sendMessage, addTrade]);

  // Reset cycle (mirrors resetCycle from JS)
  const resetCycle = useCallback(() => {
    tradeCountRef.current = 0;
    cycleTradesRef.current = [];
    scanningForEntryRef.current = true;
    cycleActiveRef.current = false;
    recoveryActiveRef.current = false;
    currentStakeRef.current = strategyRef.current.initialStake;
    setBotStatus("Scanning for entry...");
  }, []);

  const connect = useCallback(
    (token: string) => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      setIsConnecting(true);
      setError(null);
      tokenRef.current = token;

      const ws = new WebSocket(
        "wss://ws.derivws.com/websockets/v3?app_id=123283"
      );
      wsRef.current = ws;

      ws.onopen = () => {
        sendMessage({ authorize: token });
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.error) {
          setError(data.error.message);
          setIsConnecting(false);
          return;
        }

        switch (data.msg_type) {
          case "authorize":
            setIsConnected(true);
            setIsConnecting(false);
            setBalance(data.authorize.balance);
            setCurrency(data.authorize.currency);
            setAccountName(data.authorize.fullname);
            setLoginId(data.authorize.loginid);
            sendMessage({ balance: 1, subscribe: 1 });
            break;

          case "balance":
            setBalance(data.balance.balance);
            break;

          case "tick": {
            // Handle tick — entry scanning logic from JS
            if (!runningRef.current || !scanningForEntryRef.current || cycleActiveRef.current) break;

            const tick = data.tick;
            const quoteStr = tick.quote.toString();
            const lastDigit = parseInt(quoteStr.slice(-1), 10);
            setCurrentDigit(quoteStr);

            const s = strategyRef.current;
            if (s.entryDigits.includes(lastDigit)) {
              // Start 3-trade cycle
              scanningForEntryRef.current = false;
              cycleActiveRef.current = true;
              contractTypeRef.current = "DIGITOVER";
              barrierRef.current = s.overPrediction;
              executeTrade(quoteStr);
            }
            break;
          }

          case "buy": {
            // KEY FIX: Explicitly subscribe to contract updates using contract_id
            // This is the mechanism from the JS that prevents pending trades
            if (data.buy) {
              const contractId = String(data.buy.contract_id);
              // Update the pending trade with the contract ID
              setTrades((prev) => {
                const updated = [...prev];
                const pendingIdx = updated.findIndex((t) => t.result === "pending" && !t.contractId);
                if (pendingIdx !== -1) {
                  updated[pendingIdx] = { ...updated[pendingIdx], contractId };
                }
                return updated;
              });
              // Explicitly subscribe to this contract's open state
              sendMessage({
                proposal_open_contract: 1,
                contract_id: data.buy.contract_id,
                subscribe: 1,
              });
            }
            break;
          }

          case "proposal_open_contract": {
            const contract = data.proposal_open_contract;
            if (!contract || !contract.is_sold) break;

            const profit = parseFloat(contract.profit);
            const isWin = profit > 0;
            const contractId = String(contract.contract_id);
            const exitPrice = String(contract.sell_price || contract.bid_price || 0);

            // Get last cycle trade info
            const tradeInfo = cycleTradesRef.current[cycleTradesRef.current.length - 1];

            // Update trade in UI
            updateTradeResult(contractId, isWin ? "win" : "loss", profit, exitPrice);

            // Update total P&L
            totalProfitRef.current += profit;
            setTotalProfit(totalProfitRef.current);

            const s = strategyRef.current;

            // Check stop conditions
            if (totalProfitRef.current >= s.takeProfit) {
              runningRef.current = false;
              setIsRunning(false);
              setBotStatus("Take profit reached!");
              return;
            }
            if (totalProfitRef.current <= -s.stopLoss) {
              runningRef.current = false;
              setIsRunning(false);
              setBotStatus("Stop loss reached!");
              return;
            }

            if (!runningRef.current) break;

            const entryPrice = tradeInfo?.entry || "";

            // Recovery/continuation logic from JS
            if (profit < 0) {
              // Loss → recovery trade with martingale on DIGITUNDER
              currentStakeRef.current = (tradeInfo?.stake || currentStakeRef.current) * s.martingale;
              contractTypeRef.current = "DIGITUNDER";
              barrierRef.current = s.underPrediction;
              recoveryActiveRef.current = true;
              setBotStatus("Recovery trade...");
              setTimeout(() => executeTrade(entryPrice), 500);
            } else {
              // Win
              recoveryActiveRef.current = false;

              if (tradeCountRef.current < 3) {
                // Continue cycle with DIGITOVER
                currentStakeRef.current = s.initialStake;
                contractTypeRef.current = "DIGITOVER";
                barrierRef.current = s.overPrediction;
                setTimeout(() => executeTrade(entryPrice), 500);
              } else {
                // Cycle complete → reset and scan for next entry
                resetCycle();
              }
            }
            break;
          }
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection error");
        setIsConnecting(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsRunning(false);
        runningRef.current = false;
      };
    },
    [sendMessage, executeTrade, updateTradeResult, resetCycle]
  );

  const disconnect = useCallback(() => {
    runningRef.current = false;
    setIsRunning(false);
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
    setBalance(null);
    setError(null);
  }, []);

  const startBot = useCallback(() => {
    if (!isConnected) return;
    runningRef.current = true;
    setIsRunning(true);
    totalProfitRef.current = 0;
    setTotalProfit(0);
    tradeCountRef.current = 0;
    cycleTradesRef.current = [];
    scanningForEntryRef.current = true;
    cycleActiveRef.current = false;
    recoveryActiveRef.current = false;
    currentStakeRef.current = strategyRef.current.initialStake;
    contractTypeRef.current = "DIGITOVER";
    barrierRef.current = strategyRef.current.overPrediction;
    setBotStatus("Scanning for entry...");

    // Subscribe to ticks for entry scanning
    sendMessage({ ticks: "1HZ10V", subscribe: 1 });
  }, [isConnected, sendMessage]);

  const stopBot = useCallback(() => {
    runningRef.current = false;
    setIsRunning(false);
    setBotStatus("Stopped");
  }, []);

  const updateStrategy = useCallback((newStrategy: StrategyConfig) => {
    setStrategy(newStrategy);
    strategyRef.current = newStrategy;
    currentStakeRef.current = newStrategy.initialStake;
  }, []);

  return {
    isConnected,
    isConnecting,
    balance,
    currency,
    accountName,
    loginId,
    error,
    isRunning,
    trades,
    totalProfit,
    strategy,
    currentDigit,
    botStatus,
    connect,
    disconnect,
    startBot,
    stopBot,
    updateStrategy,
  };
}
