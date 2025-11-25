import { z } from "zod";
import { fetcher } from "@/src/lib/fetcher";
import { perceptionSnapshotSchema, type PerceptionSnapshot, type Setup, setupSchema } from "@/src/lib/engine/types";

function resolveUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!base) return path;
  return new URL(path, base).toString();
}

export async function fetchPerceptionSnapshot(): Promise<PerceptionSnapshot> {
  return fetcher(resolveUrl("/api/perception/today"), perceptionSnapshotSchema);
}

export async function fetchTodaySetups(): Promise<{ setups: Setup[]; setupOfTheDayId: string }> {
  const schema = z.object({
    setups: setupSchema.array(),
    setupOfTheDayId: z.string(),
  });
  const data = await fetcher(resolveUrl("/api/setups/today"), schema);
  return data;
}
