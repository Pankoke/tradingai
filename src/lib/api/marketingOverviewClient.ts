import { z } from "zod";
import { fetcher } from "@/src/lib/fetcher";

const marketingOverviewSchema = z.object({
  universeAssetsTotal: z.number(),
  activeSetups: z.number(),
  engineVersion: z.string(),
  latestSnapshotTime: z.string(),
});

export type MarketingOverviewResponse = z.infer<typeof marketingOverviewSchema>;

function resolveUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return new URL(path, base).toString();
}

export async function fetchMarketingOverview(): Promise<MarketingOverviewResponse> {
  return fetcher(resolveUrl("/api/marketing/overview"), marketingOverviewSchema);
}
