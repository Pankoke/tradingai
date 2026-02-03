export type OrderSide = "buy" | "sell";

export type EntryPolicy = "next-step-open";

export type OrderIntent = {
  assetId: string;
  side: OrderSide;
  asOfIso: string;
  entryPolicy: EntryPolicy;
  stepIndex: number;
  reason?: string;
};

export type EntryFill = {
  fillIso: string;
  fillPrice: number;
  source: "candle-open-next-step";
};

export type ExecutedEntry =
  | {
      intent: OrderIntent;
      status: "filled";
      fill: EntryFill;
    }
  | {
      intent: OrderIntent;
      status: "unfilled";
      fill?: undefined;
    };

