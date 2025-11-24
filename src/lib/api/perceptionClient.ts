import { perceptionSnapshotSchema, type PerceptionSnapshot, type Setup, setupSchema } from "@/src/lib/engine/types";

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
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!base) return path;
  return new URL(path, base).toString();
}

export async function fetchPerceptionSnapshot(): Promise<PerceptionSnapshot> {
  const res = await fetch(resolveUrl("/api/perception/today"), { method: "GET" });
  const raw = await safeJson<PerceptionSnapshot>(res);
  return perceptionSnapshotSchema.parse(raw);
}

export async function fetchTodaySetups(): Promise<{ setups: Setup[]; setupOfTheDayId: string }> {
  const res = await fetch(resolveUrl("/api/setups/today"), { method: "GET" });
  const raw = await safeJson<{ setups: Setup[]; setupOfTheDayId: string }>(res);

  const validatedSetups = setupSchema.array().parse(raw.setups);

  return {
    setups: validatedSetups,
    setupOfTheDayId: raw.setupOfTheDayId,
  };
}
