// Bot strategy definitions extracted from DBot XML files

export type BotType =
  | "over_under_cycle"      // Original Over/Under 3-trade cycle bot
  | "even_odd_reversal"     // Pro Hunter Bot: Even/Odd Reversal
  | "digit_scalper"         // Ultimate Digit Scalper: Over/Under with multi-recovery
  | "vh_recovery"           // Multi-VirtualHook Recovery
  | "over_under_vh_pro";    // Over-Under VH Pro

export type ContractType =
  | "DIGITOVER"
  | "DIGITUNDER"
  | "DIGITEVEN"
  | "DIGITODD";

export interface BotDefinition {
  id: BotType;
  name: string;
  description: string;
  defaultSymbol: string;
  tradeType: "overunder" | "evenodd";
  defaults: {
    stake: number;
    martingale: number;
    takeProfit: number;
    stopLoss: number;
    prediction: number;
    entryDigits: number[];
    consecutiveCount: number; // for even/odd reversal: how many consecutive to check
  };
}

export const BOT_DEFINITIONS: BotDefinition[] = [
  {
    id: "over_under_cycle",
    name: "Over/Under Cycle",
    description: "3-trade DIGITOVER cycle with DIGITUNDER martingale recovery. Scans ticks for entry digits.",
    defaultSymbol: "1HZ10V",
    tradeType: "overunder",
    defaults: {
      stake: 5.97,
      martingale: 2,
      takeProfit: 5.97,
      stopLoss: 5.97,
      prediction: 1,
      entryDigits: [4, 9],
      consecutiveCount: 3,
    },
  },
  {
    id: "even_odd_reversal",
    name: "Pro Hunter (Even/Odd)",
    description: "Checks if last N digits are all even → trades Odd, all odd → trades Even. Martingale on loss.",
    defaultSymbol: "R_25",
    tradeType: "evenodd",
    defaults: {
      stake: 0.5,
      martingale: 2,
      takeProfit: 4,
      stopLoss: 30,
      prediction: 0,
      entryDigits: [],
      consecutiveCount: 3,
    },
  },
  {
    id: "digit_scalper",
    name: "Digit Scalper",
    description: "DIGITOVER with prediction, recovery via DIGITUNDER with martingale. Scalps digit patterns.",
    defaultSymbol: "R_50",
    tradeType: "overunder",
    defaults: {
      stake: 0.5,
      martingale: 2,
      takeProfit: 5,
      stopLoss: 30,
      prediction: 1,
      entryDigits: [],
      consecutiveCount: 0,
    },
  },
  {
    id: "vh_recovery",
    name: "VH Recovery",
    description: "DIGITOVER with martingale recovery. Analyzes even/odd percentages for recovery direction.",
    defaultSymbol: "1HZ10V",
    tradeType: "overunder",
    defaults: {
      stake: 0.5,
      martingale: 2,
      takeProfit: 5,
      stopLoss: 30,
      prediction: 1,
      entryDigits: [],
      consecutiveCount: 0,
    },
  },
  {
    id: "over_under_vh_pro",
    name: "Over/Under VH Pro",
    description: "DIGITOVER with even/odd analysis-based recovery. Trades opposite of dominant pattern.",
    defaultSymbol: "1HZ10V",
    tradeType: "overunder",
    defaults: {
      stake: 0.5,
      martingale: 2,
      takeProfit: 5,
      stopLoss: 30,
      prediction: 1,
      entryDigits: [],
      consecutiveCount: 0,
    },
  },
];

export const VOLATILITY_SYMBOLS = [
  { value: "R_10", label: "Volatility 10" },
  { value: "1HZ10V", label: "Volatility 10 (1s)" },
  { value: "R_25", label: "Volatility 25" },
  { value: "1HZ25V", label: "Volatility 25 (1s)" },
  { value: "R_50", label: "Volatility 50" },
  { value: "1HZ50V", label: "Volatility 50 (1s)" },
  { value: "R_75", label: "Volatility 75" },
  { value: "1HZ75V", label: "Volatility 75 (1s)" },
  { value: "R_100", label: "Volatility 100" },
  { value: "1HZ100V", label: "Volatility 100 (1s)" },
] as const;

export function getBotDefinition(botType: BotType): BotDefinition {
  return BOT_DEFINITIONS.find((b) => b.id === botType) || BOT_DEFINITIONS[0];
}
