import { z } from "zod";
import { fetcher } from "@/src/lib/fetcher";
import { eventSchema, biasSnapshotSchema, type Event, type BiasSnapshot } from "@/src/lib/engine/eventsBiasTypes";

function resolveUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  if (!base) return path;
  return new URL(path, base).toString();
}

export async function fetchTodayEvents(): Promise<Event[]> {
  const schema = z.object({ events: eventSchema.array() });
  const data = await fetcher(resolveUrl("/api/events/today"), schema);
  return data.events;
}

export async function fetchTodayBiasSnapshot(): Promise<BiasSnapshot> {
  return fetcher(resolveUrl("/api/bias/today"), biasSnapshotSchema);
}
