import { NextRequest } from "next/server";
import { z } from "zod";
import { getPerceptionHistory, type PerceptionHistoryEntry } from "@/src/lib/cache/perceptionHistory";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";

const querySchema = z.object({
  limit: z
    .string()
    .transform((val) => Number.parseInt(val, 10))
    .refine((val) => Number.isFinite(val) && val > 0 && val <= 50, {
      message: "limit must be between 1 and 50",
    })
    .optional(),
});

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return respondFail("VALIDATION_ERROR", "Invalid query parameters", 400, parsed.error.issues);
    }
    const limit = parsed.data.limit ?? 20;
    const history = await getPerceptionHistory(limit);
    return respondOk<PerceptionHistoryEntry[]>(history);
  } catch (error) {
    console.error("Failed to load perception history", error);
    return respondFail(
      "INTERNAL_ERROR",
      "Failed to load perception history",
      500,
      error instanceof Error ? { message: error.message } : undefined,
    );
  }
}
