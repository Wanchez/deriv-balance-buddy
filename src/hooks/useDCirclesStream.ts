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

  const pipSizeRef = useRef(pipSize);

  /** Extract last digit from a quote, using toFixed to preserve trailing zeros */
  const extractDigit = (quote: number, decimals: number): number => {
    const str = quote.toFixed(decimals);
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

      // Detect pip_size from active_symbols or tick data
      if (data.msg_type === "tick" && data.tick) {
        const tick = data.tick;
        if (tick.symbol !== symbolRef.current) return;
        // Derive pip size from the quote string provided by the API
        const apiQuoteStr = String(tick.quote);
        const dotIdx = apiQuoteStr.indexOf(".");
        if (dotIdx !== -1) {
          const detected = apiQuoteStr.length - dotIdx - 1;
          if (detected > pipSizeRef.current) {
            pipSizeRef.current = detected;
            setPipSize(detected);
          }
        }
        const digit = extractDigit(tick.quote, pipSizeRef.current);
        const formatted = tick.quote.toFixed(pipSizeRef.current);
        setCurrentQuote(formatted);
        setLastDigit(digit);
        setDigitHistory((prev) => [...prev, digit].slice(-historyCountRef.current));
      }

      if (data.msg_type === "history" && data.history) {
        const prices: number[] = data.history.prices;
        // Detect pip size from the first price that has decimals
        for (const p of prices) {
          const s = p.toString();
          const dot = s.indexOf(".");
          if (dot !== -1) {
            const dec = s.length - dot - 1;
            if (dec > pipSizeRef.current) {
              pipSizeRef.current = dec;
              setPipSize(dec);
            }
          }
        }
        const digits = prices.map((p) => extractDigit(p, pipSizeRef.current));
        setDigitHistory(digits);
        if (digits.length > 0) {
          setLastDigit(digits[digits.length - 1]);
        }
        setIsLoadingHistory(false);
        // Now subscribe to live ticks
        ws.send(JSON.stringify({ ticks: symbolRef.current, subscribe: 1 }));
        setIsStreaming(true);
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
