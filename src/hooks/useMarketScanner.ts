import { useState, useEffect, useRef, useCallback } from "react";
import { VOLATILITY_SYMBOLS } from "@/lib/botStrategies";

export interface MarketAlert {
  symbol: string;
  label: string;
  pattern: string;
  digits: number[];
  percentages: Record<number, number>;
}

const THRESHOLD = 10.5;
const SCAN_TICKS = 1000;

function extractDigit(quote: number, decimals: number): number {
  const str = quote.toFixed(decimals);
  return parseInt(str.slice(-1), 10);
}

function detectPipSize(prices: number[]): number {
  let max = 2;
  for (const p of prices) {
    const s = p.toString();
    const dot = s.indexOf(".");
    if (dot !== -1) {
      const dec = s.length - dot - 1;
      if (dec > max) max = dec;
    }
  }
  return max;
}

function checkAlerts(
  symbol: string,
  label: string,
  percentages: Record<number, number>
): MarketAlert[] {
  const alerts: MarketAlert[] = [];

  // Check 0,1 both < 10.5%
  if (percentages[0] < THRESHOLD && percentages[1] < THRESHOLD) {
    alerts.push({
      symbol, label,
      pattern: "0 & 1 cold",
      digits: [0, 1],
      percentages,
    });
  }

  // Check 8,9 both < 10.5%
  if (percentages[8] < THRESHOLD && percentages[9] < THRESHOLD) {
    alerts.push({
      symbol, label,
      pattern: "8 & 9 cold",
      digits: [8, 9],
      percentages,
    });
  }

  // Check 0,1,2,3 all < 10.5%
  if (
    percentages[0] < THRESHOLD &&
    percentages[1] < THRESHOLD &&
    percentages[2] < THRESHOLD &&
    percentages[3] < THRESHOLD
  ) {
    alerts.push({
      symbol, label,
      pattern: "0-3 all cold",
      digits: [0, 1, 2, 3],
      percentages,
    });
  }

  return alerts;
}

export function useMarketScanner(apiToken: string | null) {
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scan = useCallback(() => {
    if (!apiToken) return;

    // Close previous
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=123283");
    wsRef.current = ws;
    setScanning(true);
    setScannedCount(0);

    const symbols = VOLATILITY_SYMBOLS.map((s) => ({ ...s }));
    let idx = 0;
    const allAlerts: MarketAlert[] = [];

    // Timeout: if scan takes too long, close and show what we have
    const timeout = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        setAlerts(allAlerts);
        setScanning(false);
        ws.close();
      }
    }, 8000);

    const scanNext = () => {
      if (idx >= symbols.length || ws.readyState !== WebSocket.OPEN) {
        clearTimeout(timeout);
        setAlerts(allAlerts);
        setScanning(false);
        if (ws.readyState === WebSocket.OPEN) ws.close();
        return;
      }
      ws.send(
        JSON.stringify({
          ticks_history: symbols[idx].value,
          adjust_start_time: 1,
          count: SCAN_TICKS,
          end: "latest",
          style: "ticks",
        })
      );
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: apiToken }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        // Skip errored symbols, continue scanning
        idx++;
        setScannedCount(idx);
        scanNext();
        return;
      }

      if (data.msg_type === "authorize") {
        scanNext();
      }

      if (data.msg_type === "history" && data.history) {
        const prices: number[] = data.history.prices;
        if (prices.length > 0) {
          const pipSize = detectPipSize(prices);
          const counts = Array(10).fill(0);
          const digits = prices.map((p) => extractDigit(p, pipSize));
          digits.forEach((d) => counts[d]++);

          const total = digits.length;
          const percentages: Record<number, number> = {};
          for (let i = 0; i < 10; i++) {
            percentages[i] = total > 0 ? (counts[i] / total) * 100 : 0;
          }

          const sym = symbols[idx];
          if (sym) {
            const found = checkAlerts(sym.value, sym.label, percentages);
            allAlerts.push(...found);
          }
        }

        idx++;
        setScannedCount(idx);
        scanNext();
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      setScanning(false);
      setAlerts(allAlerts);
    };

    ws.onclose = () => {
      clearTimeout(timeout);
    };
  }, [apiToken]);

  // Auto-scan on connect and every 10s
  useEffect(() => {
    if (!apiToken) return;
    scan();
    intervalRef.current = setInterval(scan, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [apiToken, scan]);

  return { alerts, scanning, scannedCount, totalSymbols: VOLATILITY_SYMBOLS.length, rescan: scan };
}
