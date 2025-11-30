export type SetupCategory = "trend" | "mean_reversion" | "momentum" | "range";
export type DirectionType = "long" | "short" | "both";

export type SetupDefinition = {
  id: string;
  name: string;
  category: SetupCategory;
  directionType: DirectionType;
  description: string;
  isActive: boolean;
  sortOrder: number;
  tags?: string[];
  defaultTimeframe?: string;
};

export const setupDefinitions: SetupDefinition[] = [
  {
    id: "trend_breakout",
    name: "Trend-Following Breakout",
    category: "trend",
    directionType: "both",
    description: "Markt im klaren Trend, der ein neues Hoch oder Tief ausbildet.",
    isActive: true,
    sortOrder: 1,
    tags: ["daily", "swing"],
    defaultTimeframe: "1D",
  },
  {
    id: "trend_pullback",
    name: "Trend-Pullback",
    category: "trend",
    directionType: "both",
    description: "Rücksetzer innerhalb eines intakten Trends erlauben Re-Entries.",
    isActive: true,
    sortOrder: 2,
    tags: ["daily", "swing"],
    defaultTimeframe: "1D",
  },
  {
    id: "mean_reversion_overshoot",
    name: "Mean-Reversion Overshoot",
    category: "mean_reversion",
    directionType: "both",
    description: "Überdehnte Situationen (z. B. RSI-Extrem, ATR-Überdehnung).",
    isActive: true,
    sortOrder: 3,
    tags: ["daily", "range"],
    defaultTimeframe: "1D",
  },
  {
    id: "range_compression",
    name: "Range-Compression",
    category: "range",
    directionType: "both",
    description: "Enger Seitwärtsmarkt, der auf einen bevorstehenden Breakout hinweist.",
    isActive: true,
    sortOrder: 4,
    tags: ["daily", "swing"],
    defaultTimeframe: "1D",
  },
  {
    id: "momentum_strong",
    name: "Strong Momentum",
    category: "momentum",
    directionType: "both",
    description: "Trend mit beschleunigendem Momentum (MACD/RSI-Kombination).",
    isActive: true,
    sortOrder: 5,
    tags: ["daily"],
    defaultTimeframe: "1D",
  },
];
