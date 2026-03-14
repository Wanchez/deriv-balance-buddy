import { useState, useRef, useCallback, useEffect } from "react";

export function useDCirclesStream(apiToken: string | null) {
  const [symbol, setSymbol] = useState("1HZ10V");
  const [digitHistory, setDigitHistory] = useState<number[]>([]);
  const [lastDigit, setLastDigit] = useState<number | null>(null);
  const [currentQuote, setCurrentQuote] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyCount, setHistoryCount] = useState(1000);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pipSize, setPipSize] = useState(2); // decimal places for this symbol
  const [historyCount, setHistoryCount] = useState(1000);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const symbolRef = useRef(symbol);
  const authorizedRef = useRef(false);
  const historyCountRef = useRef(historyCount);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    authorizedRef.current = false;
    setIsStreaming(false);
  }, []);

  /** Extract last digit from a quote string, preserving trailing zeros */
  const extractDigit = (quote: number, quoteStr?: string): number => {
    // Use the string representation to preserve trailing zeros
    const str = quoteStr || quote.toString();
    return parseInt(str.slice(-1), 10);
  };

  const fetchHistory = useCallback((ws: WebSocket, sym: string, count: number) => {
    setIsLoadingHistory(true);
    ws.send(
      JSON.stringify({
        ticks_history: sym,
        adjust_start_time: 1,
        count,
        end: "latest",
        style: "ticks",
      })
    );
  }, []);

  const startStream = useCallback(() => {
    if (!apiToken) return;
    cleanup();

    const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=123283");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: apiToken }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.msg_type === "authorize" && !data.error) {
        authorizedRef.current = true;
        // Fetch historical ticks first
        fetchHistory(ws, symbolRef.current, historyCountRef.current);
      }

      if (data.msg_type === "history" && data.history) {
        const prices: number[] = data.history.prices;
        // Deriv returns prices as numbers; convert to string to get trailing zeros
        // Unfortunately ticks_history doesn't give formatted strings, so we use
        // a fixed-precision approach based on the symbol's pip size
        const digits = prices.map((p) => {
          // Convert to string with enough decimals to capture last digit
          // Deriv volatility indices typically have 2-4 decimal places
          const str = p.toString();
          return parseInt(str.slice(-1), 10);
        });
        setDigitHistory(digits);
        if (digits.length > 0) {
          setLastDigit(digits[digits.length - 1]);
        }
        setIsLoadingHistory(false);
        // Now subscribe to live ticks
        ws.send(JSON.stringify({ ticks: symbolRef.current, subscribe: 1 }));
        setIsStreaming(true);
      }

      if (data.msg_type === "tick" && data.tick) {
        const tick = data.tick;
        if (tick.symbol !== symbolRef.current) return;
        const quoteStr = tick.quote.toString();
        const digit = extractDigit(tick.quote, quoteStr);
        setCurrentQuote(quoteStr);
        setLastDigit(digit);
        setDigitHistory((prev) => [...prev, digit].slice(-historyCountRef.current));
      }
    };

    ws.onerror = () => cleanup();
    ws.onclose = () => {
      setIsStreaming(false);
      authorizedRef.current = false;
    };
  }, [apiToken, cleanup, fetchHistory]);

  // Auto-start when token available
  useEffect(() => {
    if (apiToken) {
      startStream();
    }
    return cleanup;
  }, [apiToken]);

  // Switch symbol
  const changeSymbol = useCallback((newSymbol: string) => {
    symbolRef.current = newSymbol;
    setSymbol(newSymbol);
    setDigitHistory([]);
    setLastDigit(null);
    setCurrentQuote(null);

    if (wsRef.current?.readyState === WebSocket.OPEN && authorizedRef.current) {
      wsRef.current.send(JSON.stringify({ forget_all: "ticks" }));
      fetchHistory(wsRef.current, newSymbol, historyCountRef.current);
    }
  }, [fetchHistory]);

  // Change history count
  const changeHistoryCount = useCallback((count: number) => {
    historyCountRef.current = count;
    setHistoryCount(count);
    // Re-fetch if connected
    if (wsRef.current?.readyState === WebSocket.OPEN && authorizedRef.current) {
      wsRef.current.send(JSON.stringify({ forget_all: "ticks" }));
      setDigitHistory([]);
      fetchHistory(wsRef.current, symbolRef.current, count);
    }
  }, [fetchHistory]);

  return {
    symbol,
    digitHistory,
    lastDigit,
    currentQuote,
    isStreaming,
    isLoadingHistory,
    historyCount,
    changeSymbol,
    changeHistoryCount,
  };
}
