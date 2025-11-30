import type { Setup } from "./types";
import type { BiasSnapshot, Event } from "./eventsBiasTypes";
import { mockSetups } from "@/src/lib/mockSetups";
import { mockEvents } from "@/src/lib/mockEvents";
import { mockBiasSnapshot } from "@/src/lib/mockBias";

export type PerceptionDataMode = "mock" | "live";

export interface PerceptionDataSource {
  getSetupsForToday(params: { asOf: Date }): Promise<Setup[]>;
  getEventsForWindow(params: { from: Date; to: Date }): Promise<Event[]>;
  getBiasSnapshotForAssets(params: { assetIds: string[]; date: Date }): Promise<BiasSnapshot[]>;
}

export class MockPerceptionDataSource implements PerceptionDataSource {
  async getSetupsForToday(): Promise<Setup[]> {
    return mockSetups;
  }

  async getEventsForWindow(params: { from: Date; to: Date }): Promise<Event[]> {
    const fromTime = params.from.getTime();
    const toTime = params.to.getTime();

    return mockEvents.filter((event) => {
      const start = new Date(event.startTime).getTime();
      return start >= fromTime && start <= toTime;
    });
  }

  async getBiasSnapshotForAssets(): Promise<BiasSnapshot[]> {
    return [mockBiasSnapshot];
  }
}

export class LivePerceptionDataSource implements PerceptionDataSource {
  async getSetupsForToday(_params: { asOf: Date }): Promise<Setup[]> {
    const { getAllAssets } = await import(
      "@/src/server/repositories/assetRepository"
    );
    const { getCandlesForAsset } = await import(
      "@/src/server/repositories/candleRepository"
    );
    void getAllAssets;
    void getCandlesForAsset;
    throw new Error("LivePerceptionDataSource.getSetupsForToday not implemented yet");
  }

  async getEventsForWindow(_params: { from: Date; to: Date }): Promise<Event[]> {
    const { getEventsInRange } = await import(
      "@/src/server/repositories/eventRepository"
    );
    void getEventsInRange;
    throw new Error("LivePerceptionDataSource.getEventsForWindow not implemented yet");
  }

  async getBiasSnapshotForAssets(_params: {
    assetIds: string[];
    date: Date;
  }): Promise<BiasSnapshot[]> {
    const { getBiasSnapshot } = await import(
      "@/src/server/repositories/biasRepository"
    );
    void getBiasSnapshot;
    throw new Error("LivePerceptionDataSource.getBiasSnapshotForAssets not implemented yet");
  }
}

export function createPerceptionDataSource(): PerceptionDataSource {
  const mode = (process.env.NEXT_PUBLIC_PERCEPTION_DATA_MODE as PerceptionDataMode) ?? "mock";

  if (mode === "live") {
    return new LivePerceptionDataSource();
  }

  return new MockPerceptionDataSource();
}
