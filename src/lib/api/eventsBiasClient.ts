import {
  eventSchema,
  biasSnapshotSchema,
  type Event,
  type BiasSnapshot,
} from "@/src/lib/engine/eventsBiasTypes";

async function safeJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const data = (await response.json()) as unknown;
  return data as T;
}

function resolveUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  if (!base) return path;
  return new URL(path, base).toString();
}

export async function fetchTodayEvents(): Promise<Event[]> {
  const res = await fetch(resolveUrl("/api/events/today"), { method: "GET" });
  const raw = await safeJson<{ events: Event[] }>(res);
  return eventSchema.array().parse(raw.events);
}

export async function fetchTodayBiasSnapshot(): Promise<BiasSnapshot> {
  const res = await fetch(resolveUrl("/api/bias/today"), { method: "GET" });
  const raw = await safeJson<BiasSnapshot>(res);
  return biasSnapshotSchema.parse(raw);
}
