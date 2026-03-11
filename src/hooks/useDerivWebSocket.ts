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
}

export interface StrategyConfig {
  initialStake: number;
  martingale: number;
  overPrediction: number;
  underPrediction: number;
  takeProfit: number;
  stopLoss: number;
  entry: number;
}

const DEFAULT_STRATEGY: StrategyConfig = {
  initialStake: 5.97,
  martingale: 2,
  overPrediction: 1,
  underPrediction: 6,
  takeProfit: 5.97,
  stopLoss: 5.97,
  entry: 5,
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

  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string>("");
  const runningRef = useRef(false);
  const stakeRef = useRef(DEFAULT_STRATEGY.initialStake);
  const lossCounterRef = useRef(0);
  const totalProfitRef = useRef(0);
  const tradeIdRef = useRef(0);
  const strategyRef = useRef(DEFAULT_STRATEGY);
  const pendingBuyRef = useRef(false);

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const addTrade = useCallback((trade: TradeLog) => {
    setTrades((prev) => [trade, ...prev].slice(0, 100));
  }, []);

  const placeTrade = useCallback(() => {
    if (!runningRef.current || pendingBuyRef.current) return;

    const s = strategyRef.current;
    const isOver = lossCounterRef.current === 0;
    const contractType = isOver ? "DIGITOVER" : "DIGITUNDER";
    const prediction = isOver ? s.overPrediction : s.underPrediction;

    pendingBuyRef.current = true;

    sendMessage({
      buy: 1,
      subscribe: 1,
      price: stakeRef.current,
      parameters: {
        contract_type: contractType,
        symbol: "1HZ10V",
        duration: 1,
        duration_unit: "t",
        basis: "stake",
        amount: stakeRef.current,
        prediction: prediction,
        currency: "USD",
      },
    });

    tradeIdRef.current += 1;
    const trade: TradeLog = {
      id: tradeIdRef.current,
      type: isOver ? "DIGITOVER" : "DIGITUNDER",
      prediction,
      stake: stakeRef.current,
      result: "pending",
      profit: 0,
      timestamp: new Date(),
    };
    addTrade(trade);
  }, [sendMessage, addTrade]);

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

        if (data.msg_type === "authorize") {
          setIsConnected(true);
          setIsConnecting(false);
          setBalance(data.authorize.balance);
          setCurrency(data.authorize.currency);
          setAccountName(data.authorize.fullname);
          setLoginId(data.authorize.loginid);

          // Subscribe to balance updates
          sendMessage({ balance: 1, subscribe: 1 });
        }

        if (data.msg_type === "balance") {
          setBalance(data.balance.balance);
        }

        if (data.msg_type === "buy") {
          pendingBuyRef.current = false;
          if (data.buy) {
            const contractId = String(data.buy.contract_id);
            // Update the latest pending trade with contract ID
            setTrades((prev) => {
              const updated = [...prev];
              const pendingIdx = updated.findIndex((t) => t.result === "pending" && !t.contractId);
              if (pendingIdx !== -1) {
                updated[pendingIdx] = { ...updated[pendingIdx], contractId };
              }
              return updated;
            });
          }
        }

        if (data.msg_type === "proposal_open_contract") {
          const contract = data.proposal_open_contract;
          if (contract.is_sold) {
            const profit = contract.profit;
            const isWin = profit > 0;
            const contractId = String(contract.contract_id);

            totalProfitRef.current += profit;
            setTotalProfit(totalProfitRef.current);

            // Update trade — match by contractId OR first pending trade as fallback
            setTrades((prev) => {
              const updated = prev.map((t) => {
                if (t.contractId === contractId || (!t.contractId && t.result === "pending")) {
                  return { ...t, contractId, result: isWin ? ("win" as const) : ("loss" as const), profit };
                }
                return t;
              });
              return updated;
            });

            const s = strategyRef.current;

            if (isWin) {
              lossCounterRef.current = 0;
              stakeRef.current = s.initialStake;
            } else {
              stakeRef.current = stakeRef.current * s.martingale;
              lossCounterRef.current += 1;
            }

            // Check stop conditions
            if (totalProfitRef.current >= s.takeProfit) {
              runningRef.current = false;
              setIsRunning(false);
              return;
            }
            if (totalProfitRef.current <= -s.stopLoss) {
              runningRef.current = false;
              setIsRunning(false);
              return;
            }

            // Place next trade
            if (runningRef.current) {
              setTimeout(() => placeTrade(), 500);
            }
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
    [sendMessage, placeTrade]
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
    lossCounterRef.current = 0;
    stakeRef.current = strategyRef.current.initialStake;
    pendingBuyRef.current = false;
    placeTrade();
  }, [isConnected, placeTrade]);

  const stopBot = useCallback(() => {
    runningRef.current = false;
    setIsRunning(false);
  }, []);

  const updateStrategy = useCallback((newStrategy: StrategyConfig) => {
    setStrategy(newStrategy);
    strategyRef.current = newStrategy;
    stakeRef.current = newStrategy.initialStake;
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
    connect,
    disconnect,
    startBot,
    stopBot,
    updateStrategy,
  };
}
