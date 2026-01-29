export type EventRow = {
  id: string;
  providerId?: string | null;
  title: string;
  description?: string | null;
  category: string;
  impact: number;
  country?: string | null;
  summary?: string | null;
  marketScope?: string | null;
  expectationLabel?: string | null;
  expectationConfidence?: number | null;
  expectationNote?: string | null;
  enrichedAt?: Date | null;
  scheduledAt: Date;
  actualValue?: string | null;
  previousValue?: string | null;
  forecastValue?: string | null;
  affectedAssets?: unknown;
  source: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type EventInsert = Omit<EventRow, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};
