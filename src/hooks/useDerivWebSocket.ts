import { useState, useRef, useCallback } from "react";
import { type BotType, type ContractType, getBotDefinition } from "@/lib/botStrategies";

export interface TradeLog {
  id: number;
  type: string;
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
  botType: BotType;
  symbol: string;
  consecutiveCount: number;
}

const DEFAULT_STRATEGY: StrategyConfig = {
  initialStake: 5.97,
  martingale: 2,
  overPrediction: 1,
  underPrediction: 6,
  takeProfit: 5.97,
  stopLoss: 5.97,
  entryDigits: [4, 9],
  botType: "over_under_cycle",
  symbol: "1HZ10V",
  consecutiveCount: 3,
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

  // Cycle state
  const currentStakeRef = useRef(DEFAULT_STRATEGY.initialStake);
  const tradeCountRef = useRef(0);
  const cycleActiveRef = useRef(false);
  const scanningForEntryRef = useRef(true);
  const recoveryActiveRef = useRef(false);
  const contractTypeRef = useRef<string>("DIGITOVER");
  const barrierRef = useRef(1);
  const cycleTradesRef = useRef<{ contractType: string; stake: number; entry: string }[]>([]);

  // Digit history for even/odd analysis
  const digitHistoryRef = useRef<number[]>([]);

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
        t.contractId === contractId || (!t.contractId && t.result === "pending")
          ? { ...t, result, profit, exitPrice, contractId }
          : t
      )
    );
  }, []);

  const executeTrade = useCallback((entryPrice: string) => {
    if (!runningRef.current) return;
    const s = strategyRef.current;
    const cType = contractTypeRef.current;
    const barrier = barrierRef.current;
    const stake = currentStakeRef.current;

    cycleTradesRef.current.push({ contractType: cType, stake, entry: entryPrice });
    setBotStatus(`${cType} | Stake ${stake.toFixed(2)}`);

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

    // Build buy parameters based on contract type
    const params: Record<string, unknown> = {
      amount: stake,
      basis: "stake",
      contract_type: cType,
      currency: "USD",
      duration: 1,
      duration_unit: "t",
      symbol: s.symbol,
    };

    // Only add barrier for DIGITOVER/DIGITUNDER
    if (cType === "DIGITOVER" || cType === "DIGITUNDER") {
      params.barrier = barrier;
    }

    sendMessage({
      buy: 1,
      price: stake,
      parameters: params,
    });

    if (!recoveryActiveRef.current) {
      tradeCountRef.current += 1;
    }
  }, [sendMessage, addTrade]);

  const resetCycle = useCallback(() => {
    tradeCountRef.current = 0;
    cycleTradesRef.current = [];
    scanningForEntryRef.current = true;
    cycleActiveRef.current = false;
    recoveryActiveRef.current = false;
    currentStakeRef.current = strategyRef.current.initialStake;
    setBotStatus("Scanning for entry...");
  }, []);

  // --- Strategy-specific tick handlers ---

  const handleTickOverUnderCycle = useCallback((quoteStr: string, lastDigit: number) => {
    if (!scanningForEntryRef.current || cycleActiveRef.current) return;
    const s = strategyRef.current;
    if (s.entryDigits.includes(lastDigit)) {
      scanningForEntryRef.current = false;
      cycleActiveRef.current = true;
      contractTypeRef.current = "DIGITOVER";
      barrierRef.current = s.overPrediction;
      executeTrade(quoteStr);
    }
  }, [executeTrade]);

  const handleTickEvenOddReversal = useCallback((quoteStr: string, lastDigit: number) => {
    // Track digit history
    digitHistoryRef.current.push(lastDigit);
    if (digitHistoryRef.current.length > 100) digitHistoryRef.current.shift();

    if (cycleActiveRef.current) return;

    const s = strategyRef.current;
    const count = s.consecutiveCount || 3;
    const history = digitHistoryRef.current;

    if (history.length < count) return;

    const lastN = history.slice(-count);
    const allEven = lastN.every((d) => d % 2 === 0);
    const allOdd = lastN.every((d) => d % 2 !== 0);

    if (allEven) {
      cycleActiveRef.current = true;
      contractTypeRef.current = "DIGITODD";
      barrierRef.current = 0;
      executeTrade(quoteStr);
    } else if (allOdd) {
      cycleActiveRef.current = true;
      contractTypeRef.current = "DIGITEVEN";
      barrierRef.current = 0;
      executeTrade(quoteStr);
    }
  }, [executeTrade]);

  const handleTickDigitScalper = useCallback((quoteStr: string, lastDigit: number) => {
    digitHistoryRef.current.push(lastDigit);
    if (digitHistoryRef.current.length > 100) digitHistoryRef.current.shift();

    if (cycleActiveRef.current) return;

    // Digit scalper: continuously trade DIGITOVER with prediction
    const s = strategyRef.current;
    cycleActiveRef.current = true;
    contractTypeRef.current = "DIGITOVER";
    barrierRef.current = s.overPrediction;
    executeTrade(quoteStr);
  }, [executeTrade]);

  const handleTickVHRecovery = useCallback((quoteStr: string, lastDigit: number) => {
    digitHistoryRef.current.push(lastDigit);
    if (digitHistoryRef.current.length > 100) digitHistoryRef.current.shift();

    if (cycleActiveRef.current) return;

    const s = strategyRef.current;
    cycleActiveRef.current = true;
    contractTypeRef.current = "DIGITOVER";
    barrierRef.current = s.overPrediction;
    executeTrade(quoteStr);
  }, [executeTrade]);

  const handleTickOverUnderVHPro = useCallback((quoteStr: string, lastDigit: number) => {
    digitHistoryRef.current.push(lastDigit);
    if (digitHistoryRef.current.length > 100) digitHistoryRef.current.shift();

    if (cycleActiveRef.current) return;

    const s = strategyRef.current;
    cycleActiveRef.current = true;
    contractTypeRef.current = "DIGITOVER";
    barrierRef.current = s.overPrediction;
    executeTrade(quoteStr);
  }, [executeTrade]);

  // --- Strategy-specific result handlers ---

  const handleResultOverUnderCycle = useCallback((profit: number, entryPrice: string, tradeStake: number) => {
    const s = strategyRef.current;
    if (profit < 0) {
      currentStakeRef.current = tradeStake * s.martingale;
      contractTypeRef.current = "DIGITUNDER";
      barrierRef.current = s.underPrediction;
      recoveryActiveRef.current = true;
      setBotStatus("Recovery trade...");
      setTimeout(() => executeTrade(entryPrice), 500);
    } else {
      recoveryActiveRef.current = false;
      if (tradeCountRef.current < 3) {
        currentStakeRef.current = s.initialStake;
        contractTypeRef.current = "DIGITOVER";
        barrierRef.current = s.overPrediction;
        setTimeout(() => executeTrade(entryPrice), 500);
      } else {
        resetCycle();
      }
    }
  }, [executeTrade, resetCycle]);

  const handleResultEvenOddReversal = useCallback((profit: number, entryPrice: string, tradeStake: number) => {
    const s = strategyRef.current;
    if (profit < 0) {
      currentStakeRef.current = tradeStake * s.martingale;
      recoveryActiveRef.current = true;
      setBotStatus("Martingale recovery...");
      // Keep same contract type for recovery
      setTimeout(() => executeTrade(entryPrice), 500);
    } else {
      recoveryActiveRef.current = false;
      currentStakeRef.current = s.initialStake;
      cycleActiveRef.current = false;
      setBotStatus("Scanning for pattern...");
    }
  }, [executeTrade]);

  const handleResultDigitScalper = useCallback((profit: number, entryPrice: string, tradeStake: number) => {
    const s = strategyRef.current;
    if (profit < 0) {
      currentStakeRef.current = tradeStake * s.martingale;
      contractTypeRef.current = "DIGITUNDER";
      barrierRef.current = s.underPrediction;
      recoveryActiveRef.current = true;
      setBotStatus("Recovery: DIGITUNDER...");
      setTimeout(() => executeTrade(entryPrice), 500);
    } else {
      recoveryActiveRef.current = false;
      currentStakeRef.current = s.initialStake;
      contractTypeRef.current = "DIGITOVER";
      barrierRef.current = s.overPrediction;
      cycleActiveRef.current = false;
      setBotStatus("Scanning...");
    }
  }, [executeTrade]);

  const handleResultVHRecovery = useCallback((profit: number, entryPrice: string, tradeStake: number) => {
    const s = strategyRef.current;
    const history = digitHistoryRef.current;

    if (profit < 0) {
      currentStakeRef.current = tradeStake * s.martingale;
      recoveryActiveRef.current = true;

      // Analyze even/odd percentages of last 30 digits for recovery direction
      const last30 = history.slice(-30);
      const evenCount = last30.filter((d) => d % 2 === 0).length;
      const oddCount = last30.length - evenCount;

      if (evenCount > oddCount) {
        contractTypeRef.current = "DIGITODD";
        setBotStatus("Recovery: DIGITODD (even dominant)...");
      } else {
        contractTypeRef.current = "DIGITEVEN";
        setBotStatus("Recovery: DIGITEVEN (odd dominant)...");
      }
      barrierRef.current = 0;
      setTimeout(() => executeTrade(entryPrice), 500);
    } else {
      recoveryActiveRef.current = false;
      currentStakeRef.current = s.initialStake;
      contractTypeRef.current = "DIGITOVER";
      barrierRef.current = s.overPrediction;
      cycleActiveRef.current = false;
      setBotStatus("Scanning...");
    }
  }, [executeTrade]);

  const handleResultOverUnderVHPro = useCallback((profit: number, entryPrice: string, tradeStake: number) => {
    const s = strategyRef.current;
    const history = digitHistoryRef.current;

    if (profit < 0) {
      currentStakeRef.current = tradeStake * s.martingale;
      recoveryActiveRef.current = true;

      // Analyze even/odd percentages for recovery
      const last30 = history.slice(-30);
      const evenCount = last30.filter((d) => d % 2 === 0).length;
      const oddCount = last30.length - evenCount;
      const lastDigit = history[history.length - 1];

      if (evenCount > oddCount && lastDigit % 2 !== 0) {
        contractTypeRef.current = "DIGITEVEN";
        setBotStatus("Recovery: DIGITEVEN...");
      } else if (oddCount > evenCount && lastDigit % 2 === 0) {
        contractTypeRef.current = "DIGITODD";
        setBotStatus("Recovery: DIGITODD...");
      } else {
        contractTypeRef.current = "DIGITUNDER";
        barrierRef.current = s.underPrediction;
        setBotStatus("Recovery: DIGITUNDER...");
      }
      setTimeout(() => executeTrade(entryPrice), 500);
    } else {
      recoveryActiveRef.current = false;
      currentStakeRef.current = s.initialStake;
      contractTypeRef.current = "DIGITOVER";
      barrierRef.current = s.overPrediction;
      cycleActiveRef.current = false;
      setBotStatus("Scanning...");
    }
  }, [executeTrade]);

  const connect = useCallback(
    (token: string) => {
      if (wsRef.current) wsRef.current.close();

      setIsConnecting(true);
      setError(null);
      tokenRef.current = token;

      const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=123283");
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
            if (!runningRef.current) break;

            const tick = data.tick;
            // Only process ticks from the selected symbol
            if (tick.symbol && tick.symbol !== strategyRef.current.symbol) break;

            const quoteStr = tick.quote.toString();
            const lastDigit = parseInt(quoteStr.slice(-1), 10);
            setCurrentDigit(quoteStr);

            const botType = strategyRef.current.botType;

            switch (botType) {
              case "over_under_cycle":
                handleTickOverUnderCycle(quoteStr, lastDigit);
                break;
              case "even_odd_reversal":
                handleTickEvenOddReversal(quoteStr, lastDigit);
                break;
              case "digit_scalper":
                handleTickDigitScalper(quoteStr, lastDigit);
                break;
              case "vh_recovery":
                handleTickVHRecovery(quoteStr, lastDigit);
                break;
              case "over_under_vh_pro":
                handleTickOverUnderVHPro(quoteStr, lastDigit);
                break;
            }
            break;
          }

          case "buy": {
            if (data.buy) {
              const contractId = String(data.buy.contract_id);
              setTrades((prev) => {
                const updated = [...prev];
                const pendingIdx = updated.findIndex((t) => t.result === "pending" && !t.contractId);
                if (pendingIdx !== -1) {
                  updated[pendingIdx] = { ...updated[pendingIdx], contractId };
                }
                return updated;
              });
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
            const tradeInfo = cycleTradesRef.current[cycleTradesRef.current.length - 1];

            updateTradeResult(contractId, isWin ? "win" : "loss", profit, exitPrice);

            totalProfitRef.current += profit;
            setTotalProfit(totalProfitRef.current);

            const s = strategyRef.current;

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
            const tradeStake = tradeInfo?.stake || currentStakeRef.current;

            switch (s.botType) {
              case "over_under_cycle":
                handleResultOverUnderCycle(profit, entryPrice, tradeStake);
                break;
              case "even_odd_reversal":
                handleResultEvenOddReversal(profit, entryPrice, tradeStake);
                break;
              case "digit_scalper":
                handleResultDigitScalper(profit, entryPrice, tradeStake);
                break;
              case "vh_recovery":
                handleResultVHRecovery(profit, entryPrice, tradeStake);
                break;
              case "over_under_vh_pro":
                handleResultOverUnderVHPro(profit, entryPrice, tradeStake);
                break;
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
    [
      sendMessage, executeTrade, updateTradeResult, resetCycle,
      handleTickOverUnderCycle, handleTickEvenOddReversal, handleTickDigitScalper,
      handleTickVHRecovery, handleTickOverUnderVHPro,
      handleResultOverUnderCycle, handleResultEvenOddReversal, handleResultDigitScalper,
      handleResultVHRecovery, handleResultOverUnderVHPro,
    ]
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
    digitHistoryRef.current = [];
    scanningForEntryRef.current = true;
    cycleActiveRef.current = false;
    recoveryActiveRef.current = false;
    currentStakeRef.current = strategyRef.current.initialStake;
    contractTypeRef.current = "DIGITOVER";
    barrierRef.current = strategyRef.current.overPrediction;
    setBotStatus("Scanning for entry...");

    // Unsubscribe from all previous tick streams first
    sendMessage({ forget_all: "ticks" });
    // Subscribe only to the selected symbol
    sendMessage({ ticks: strategyRef.current.symbol, subscribe: 1 });
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
