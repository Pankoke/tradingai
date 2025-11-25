import { eventSchema, type Event } from "@/src/lib/engine/eventsBiasTypes";

const now = new Date();
const addHours = (date: Date, hours: number): string => {
  const copy = new Date(date);
  copy.setHours(copy.getHours() + hours);
  return copy.toISOString();
};

const rawEvents: Event[] = eventSchema.array().parse([
  {
    id: "evt-fomc-1",
    title: "FOMC Statement",
    description: "Monetary policy statement with updated rate guidance.",
    category: "macro",
    severity: "high",
    startTime: addHours(now, 2),
    endTime: null,
    symbols: [],
    source: "macro-calendar",
  },
  {
    id: "evt-btc-etf-1",
    title: "BTC ETF Flow Report",
    description: "Daily flows for BTC ETF products impacting spot demand.",
    category: "crypto",
    severity: "medium",
    startTime: addHours(now, -3),
    endTime: null,
    symbols: ["BTCUSDT"],
    source: "crypto-newswire",
  },
  {
    id: "evt-onchain-1",
    title: "On-chain Liquidity Shift",
    description: "Exchange reserves decrease; potential supply squeeze.",
    category: "onchain",
    severity: "medium",
    startTime: addHours(now, -1),
    endTime: null,
    symbols: ["BTCUSDT", "ETHUSDT"],
    source: "onchain-monitor",
  },
  {
    id: "evt-tech-1",
    title: "Support/Resistance Test",
    description: "Key technical level tested on NAS100 around previous high.",
    category: "technical",
    severity: "low",
    startTime: addHours(now, 4),
    endTime: addHours(now, 5),
    symbols: ["NAS100"],
    source: "technical-scanner",
  },
]);

export const mockEvents: Event[] = rawEvents;
