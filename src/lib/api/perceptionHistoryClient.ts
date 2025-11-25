import type { PerceptionHistoryEntry } from "@/src/lib/cache/perceptionHistory";

async function safeJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchPerceptionHistory(limit?: number): Promise<PerceptionHistoryEntry[]> {
  const search = limit && limit > 0 ? `?limit=${limit}` : "";
  const res = await fetch(`/api/perception/history${search}`, { method: "GET" });
  return safeJson<PerceptionHistoryEntry[]>(res);
}
