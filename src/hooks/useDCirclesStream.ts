import { useState, useRef, useCallback, useEffect } from "react";

export function useDCirclesStream(apiToken: string | null) {
  const [symbol, setSymbol] = useState("1HZ10V");
  const [digitHistory, setDigitHistory] = useState<number[]>([]);
  const [lastDigit, setLastDigit] = useState<number | null>(null);
  const [currentQuote, setCurrentQuote] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const symbolRef = useRef(symbol);
  const authorizedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    authorizedRef.current = false;
    setIsStreaming(false);
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
        setIsStreaming(true);
        ws.send(JSON.stringify({ ticks: symbolRef.current, subscribe: 1 }));
      }

      if (data.msg_type === "tick" && data.tick) {
        const tick = data.tick;
        if (tick.symbol !== symbolRef.current) return;
        const quoteStr = tick.quote.toString();
        const digit = parseInt(quoteStr.slice(-1), 10);
        setCurrentQuote(quoteStr);
        setLastDigit(digit);
        setDigitHistory((prev) => [...prev, digit].slice(-500));
      }
    };

    ws.onerror = () => cleanup();
    ws.onclose = () => {
      setIsStreaming(false);
      authorizedRef.current = false;
    };
  }, [apiToken, cleanup]);

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
      wsRef.current.send(JSON.stringify({ ticks: newSymbol, subscribe: 1 }));
    }
  }, []);

  return {
    symbol,
    digitHistory,
    lastDigit,
    currentQuote,
    isStreaming,
    changeSymbol,
  };
}
