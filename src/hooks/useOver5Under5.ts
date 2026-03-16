import { useState, useRef, useCallback, useEffect } from "react";
import { VOLATILITY_SYMBOLS } from "@/lib/botStrategies";

export interface VirtualTrade {
  id: number;
  type: "DIGITOVER" | "DIGITUNDER";
  barrier: number;
  stake: number;
  result: "win" | "loss" | "pending" | "virtual_win" | "virtual_loss";
  profit: number;
  timestamp: Date;
  entryDigit: number;
  isVirtual: boolean;
}

export type StopLossMode = "amount" | "losses";
export type TradingMode = "normal" | "turbo";

export interface Over5Config {
  symbol: string;
  direction: "over" | "under";
  barrier: number;
  stake: number;
  martingale: number;
  takeProfit: number;
  stopLossMode: StopLossMode;
  stopLossAmount: number;
  maxLosses: number;
  virtualEntryTrigger: "losses" | "wins";
  virtualEntryCount: number;
  mode: TradingMode;
}

export interface Over5Stats {
  tickCount: number;
  overCount: number;
  underCount: number;
  overPct: number;
  underPct: number;
}

const DEFAULT_CONFIG: Over5Config = {
  symbol: "1HZ75V",
  direction: "over",
  barrier: 5,
  stake: 0.35,
  martingale: 2,
  takeProfit: 2,
  stopLossMode: "losses",
  stopLossAmount: 10,
  maxLosses: 9,
  virtualEntryTrigger: "losses",
  virtualEntryCount: 4,
  mode: "normal",
};

export function useOver5Under5(apiToken: string | null) {
  const [config, setConfig] = useState<Over5Config>(DEFAULT_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [trades, setTrades] = useState<VirtualTrade[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [botStatus, setBotStatus] = useState("");
  const [currentDigit, setCurrentDigit] = useState<number | null>(null);
  const [virtualCount, setVirtualCount] = useState(0);
  const [realLossCount, setRealLossCount] = useState(0);
  const [digitHistory, setDigitHistory] = useState<number[]>([]);
  const [statDepth, setStatDepth] = useState(200);

  const wsRef = useRef<WebSocket | null>(null);
  const configRef = useRef(DEFAULT_CONFIG);
  const runningRef = useRef(false);
  const tradeIdRef = useRef(0);
  const totalProfitRef = useRef(0);
  const realLossCountRef = useRef(0);

  // Virtual mode tracking
  const inVirtualModeRef = useRef(true);
  const virtualCountRef = useRef(0);
  const currentStakeRef = useRef(DEFAULT_CONFIG.stake);
  const waitingForContractRef = useRef(false);
  const inRecoveryRef = useRef(false);

  const digitHistoryRef = useRef<number[]>([]);

  // Stats WebSocket
  const statsWsRef = useRef<WebSocket | null>(null);

  // Compute stats from digitHistory
  const computeStats = useCallback((digits: number[], depth: number) => {
    const slice = digits.slice(-depth);
    const total = slice.length;
    const barrier = configRef.current.barrier;
    const overC = slice.filter((d) => d > barrier).length;
    const underC = slice.filter((d) => d < barrier).length;
    const equalC = slice.filter((d) => d === barrier).length;
    return {
      tickCount: total,
      overCount: overC,
      underCount: underC,
      equalCount: equalC,
      overPct: total > 0 ? (overC / total) * 100 : 0,
      underPct: total > 0 ? (underC / total) * 100 : 0,
    };
  }, []);

  const addDigitToHistory = useCallback((digit: number) => {
    digitHistoryRef.current = [...digitHistoryRef.current, digit].slice(-1200);
    setDigitHistory([...digitHistoryRef.current]);
  }, []);

  // --- Fetch initial 50 ticks ---
  const fetchInitialTicks = useCallback(() => {
    if (!apiToken) return;
    if (statsWsRef.current) statsWsRef.current.close();

    const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=123283");
    statsWsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: apiToken }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.msg_type === "authorize" && !data.error) {
        ws.send(JSON.stringify({
          ticks_history: configRef.current.symbol,
          adjust_start_time: 1,
          count: 50,
          end: "latest",
          style: "ticks",
        }));
      }

      if (data.msg_type === "history" && data.history) {
        const prices: number[] = data.history.prices;
        let pipSize = 2;
        for (const p of prices) {
          const s = p.toString();
          const dot = s.indexOf(".");
          if (dot !== -1) {
            const dec = s.length - dot - 1;
            if (dec > pipSize) pipSize = dec;
          }
        }
        const digits = prices.map((p) => {
          const str = p.toFixed(pipSize);
          return parseInt(str.slice(-1), 10);
        });
        digitHistoryRef.current = digits;
        setDigitHistory([...digits]);
        ws.close();
      }
    };

    ws.onerror = () => { };
  }, [apiToken]);

  // Fetch on mount and when symbol changes
  useEffect(() => {
    if (apiToken) {
      digitHistoryRef.current = [];
      setDigitHistory([]);
      fetchInitialTicks();
    }
  }, [apiToken, config.symbol]);

  // --- Trading logic ---
  const evaluateTick = useCallback((digit: number): "win" | "loss" => {
    const c = configRef.current;
    if (c.direction === "over") {
      return digit > c.barrier ? "win" : "loss";
    } else {
      return digit < c.barrier ? "win" : "loss";
    }
  }, []);

  const checkStopConditions = useCallback((): boolean => {
    const c = configRef.current;
    if (totalProfitRef.current >= c.takeProfit) {
      setBotStatus("✅ Take profit reached!");
      return true;
    }
    if (c.stopLossMode === "amount" && totalProfitRef.current <= -c.stopLossAmount) {
      setBotStatus("🛑 Stop loss (amount) reached!");
      return true;
    }
    if (c.stopLossMode === "losses" && realLossCountRef.current >= c.maxLosses) {
      setBotStatus("🛑 Stop loss (max losses) reached!");
      return true;
    }
    return false;
  }, []);

  const addVirtualTrade = useCallback((digit: number, result: "win" | "loss") => {
    tradeIdRef.current++;
    const trade: VirtualTrade = {
      id: tradeIdRef.current,
      type: configRef.current.direction === "over" ? "DIGITOVER" : "DIGITUNDER",
      barrier: configRef.current.barrier,
      stake: 0,
      result: result === "win" ? "virtual_win" : "virtual_loss",
      profit: 0,
      timestamp: new Date(),
      entryDigit: digit,
      isVirtual: true,
    };
    setTrades((prev) => [trade, ...prev].slice(0, 200));
  }, []);

  const placeRealTrade = useCallback((digit: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const c = configRef.current;
    const stake = currentStakeRef.current;

    waitingForContractRef.current = true;

    tradeIdRef.current++;
    const trade: VirtualTrade = {
      id: tradeIdRef.current,
      type: c.direction === "over" ? "DIGITOVER" : "DIGITUNDER",
      barrier: c.barrier,
      stake,
      result: "pending",
      profit: 0,
      timestamp: new Date(),
      entryDigit: digit,
      isVirtual: false,
    };
    setTrades((prev) => [trade, ...prev].slice(0, 200));
    setBotStatus(`🎯 REAL: ${c.direction === "over" ? "OVER" : "UNDER"} ${c.barrier} | $${stake.toFixed(2)}`);

    const contractType = c.direction === "over" ? "DIGITOVER" : "DIGITUNDER";
    wsRef.current.send(JSON.stringify({
      buy: 1,
      price: stake,
      parameters: {
        amount: stake,
        basis: "stake",
        contract_type: contractType,
        currency: "USD",
        duration: 1,
        duration_unit: "t",
        symbol: c.symbol,
        barrier: c.barrier,
      },
    }));
  }, []);

  const handleTick = useCallback((digit: number) => {
    if (!runningRef.current || waitingForContractRef.current) return;

    const c = configRef.current;
    const result = evaluateTick(digit);

    // If in recovery mode (Normal mode after a real loss)
    if (inRecoveryRef.current) {
      // Keep placing real trades until win
      placeRealTrade(digit);
      return;
    }

    // Virtual mode: demo trades
    if (inVirtualModeRef.current) {
      addVirtualTrade(digit, result);

      if (c.virtualEntryTrigger === "losses" && result === "loss") {
        virtualCountRef.current++;
        setVirtualCount(virtualCountRef.current);
        setBotStatus(`Virtual Mode — ${c.direction === "over" ? "Over" : "Under"} ${c.barrier} | L: ${virtualCountRef.current}/${c.virtualEntryCount}`);
      } else if (c.virtualEntryTrigger === "wins" && result === "win") {
        virtualCountRef.current++;
        setVirtualCount(virtualCountRef.current);
        setBotStatus(`Virtual Mode — ${c.direction === "over" ? "Over" : "Under"} ${c.barrier} | W: ${virtualCountRef.current}/${c.virtualEntryCount}`);
      } else if (c.virtualEntryTrigger === "losses" && result === "win") {
        // Reset counter on win
        virtualCountRef.current = 0;
        setVirtualCount(0);
        setBotStatus(`Virtual Mode — ${c.direction === "over" ? "Over" : "Under"} ${c.barrier} | L: 0/${c.virtualEntryCount}`);
      } else if (c.virtualEntryTrigger === "wins" && result === "loss") {
        virtualCountRef.current = 0;
        setVirtualCount(0);
        setBotStatus(`Virtual Mode — ${c.direction === "over" ? "Over" : "Under"} ${c.barrier} | W: 0/${c.virtualEntryCount}`);
      }

      // Check if trigger reached
      if (virtualCountRef.current >= c.virtualEntryCount) {
        inVirtualModeRef.current = false;
        virtualCountRef.current = 0;
        setVirtualCount(0);
        currentStakeRef.current = c.stake;
        setBotStatus("🔴 Triggered! Placing real trade...");
        // Don't trade on this tick - wait for next
      }
    } else {
      // Place real trade
      placeRealTrade(digit);
    }
  }, [evaluateTick, addVirtualTrade, placeRealTrade]);

  const handleContractResult = useCallback((profit: number, contractId: string) => {
    const c = configRef.current;
    const isWin = profit > 0;

    totalProfitRef.current += profit;
    setTotalProfit(totalProfitRef.current);

    // Update trade result
    setTrades((prev) =>
      prev.map((t) =>
        t.result === "pending" && !t.isVirtual
          ? { ...t, result: isWin ? "win" : "loss", profit }
          : t
      )
    );

    waitingForContractRef.current = false;

    if (!isWin) {
      realLossCountRef.current++;
      setRealLossCount(realLossCountRef.current);
    }

    if (checkStopConditions()) {
      runningRef.current = false;
      setIsRunning(false);
      return;
    }

    if (!runningRef.current) return;

    if (isWin) {
      // Win: reset to virtual mode
      inRecoveryRef.current = false;
      inVirtualModeRef.current = true;
      virtualCountRef.current = 0;
      setVirtualCount(0);
      currentStakeRef.current = c.stake;
      setBotStatus(`Virtual Mode — ${c.direction === "over" ? "Over" : "Under"} ${c.barrier} | L: 0/${c.virtualEntryCount}`);
    } else {
      // Loss
      currentStakeRef.current = currentStakeRef.current * c.martingale;

      if (c.mode === "normal") {
        // Normal: keep real trading until recovery
        inRecoveryRef.current = true;
        inVirtualModeRef.current = false;
        setBotStatus(`Recovery — $${currentStakeRef.current.toFixed(2)}`);
      } else {
        // Turbo: go back to virtual mode
        inRecoveryRef.current = false;
        inVirtualModeRef.current = true;
        virtualCountRef.current = 0;
        setVirtualCount(0);
        setBotStatus(`Virtual Mode (Turbo) — $${currentStakeRef.current.toFixed(2)} | L: 0/${c.virtualEntryCount}`);
      }
    }
  }, [checkStopConditions]);

  const start = useCallback(() => {
    if (!apiToken || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    runningRef.current = true;
    setIsRunning(true);
    totalProfitRef.current = 0;
    setTotalProfit(0);
    realLossCountRef.current = 0;
    setRealLossCount(0);
    tradeIdRef.current = 0;
    setTrades([]);
    inVirtualModeRef.current = true;
    virtualCountRef.current = 0;
    setVirtualCount(0);
    currentStakeRef.current = configRef.current.stake;
    inRecoveryRef.current = false;
    waitingForContractRef.current = false;

    const c = configRef.current;
    setBotStatus(`Virtual Mode — ${c.direction === "over" ? "Over" : "Under"} ${c.barrier} | L: 0/${c.virtualEntryCount}`);

    // Subscribe to ticks
    wsRef.current.send(JSON.stringify({ forget_all: "ticks" }));
    wsRef.current.send(JSON.stringify({ ticks: c.symbol, subscribe: 1 }));

    // Refresh stats
    fetchInitialTicks();
  }, [apiToken, fetchInitialTicks]);

  const stop = useCallback(() => {
    runningRef.current = false;
    setIsRunning(false);
    waitingForContractRef.current = false;
    setBotStatus("Stopped");
  }, []);

  // Connect WebSocket
  const connect = useCallback(() => {
    if (!apiToken) return;
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=123283");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: apiToken }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.msg_type === "authorize" && !data.error) {
        // Start streaming ticks immediately after auth
        ws.send(JSON.stringify({ forget_all: "ticks" }));
        ws.send(JSON.stringify({ ticks: configRef.current.symbol, subscribe: 1 }));
      }

      if (data.msg_type === "tick" && data.tick) {
        if (data.tick.symbol !== configRef.current.symbol) return;
        const quoteStr = String(data.tick.quote);
        const dotIdx = quoteStr.indexOf(".");
        let pipSize = 2;
        if (dotIdx !== -1) pipSize = Math.max(pipSize, quoteStr.length - dotIdx - 1);
        const formatted = data.tick.quote.toFixed(pipSize);
        const digit = parseInt(formatted.slice(-1), 10);
        setCurrentDigit(digit);
        addDigitToHistory(digit);
        handleTick(digit);
      }

      if (data.msg_type === "buy" && data.buy) {
        const contractId = data.buy.contract_id;
        ws.send(JSON.stringify({
          proposal_open_contract: 1,
          contract_id: contractId,
          subscribe: 1,
        }));
      }

      if (data.msg_type === "proposal_open_contract") {
        const contract = data.proposal_open_contract;
        if (!contract || !contract.is_sold) return;
        const profit = parseFloat(contract.profit);
        handleContractResult(profit, String(contract.contract_id));
      }
    };

    ws.onerror = () => { };
    ws.onclose = () => {
      runningRef.current = false;
      setIsRunning(false);
    };
  }, [apiToken, handleTick, handleContractResult]);

  // Auto-connect and start streaming when token available
  useEffect(() => {
    if (apiToken) {
      connect();
      // Start tick streaming immediately (independent of bot)
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ forget_all: "ticks" }));
          wsRef.current.send(JSON.stringify({ ticks: configRef.current.symbol, subscribe: 1 }));
        }
      }, 1500);
    }
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (statsWsRef.current) statsWsRef.current.close();
    };
  }, [apiToken]);

  const updateConfig = useCallback((newConfig: Over5Config) => {
    setConfig(newConfig);
    configRef.current = newConfig;
    currentStakeRef.current = newConfig.stake;
  }, []);

  return {
    config,
    updateConfig,
    isRunning,
    trades,
    totalProfit,
    botStatus,
    currentDigit,
    virtualCount,
    realLossCount,
    digitHistory,
    statDepth,
    setStatDepth,
    computeStats,
    start,
    stop,
    fetchInitialTicks,
  };
}
