import { mockBiasSnapshot } from "@/src/lib/mockBias";
import type { BiasSnapshot } from "@/src/lib/engine/eventsBiasTypes";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";

export async function GET(): Promise<Response> {
  try {
    return respondOk<BiasSnapshot>(mockBiasSnapshot);
  } catch (error) {
    console.error("Failed to load bias snapshot", error);
    return respondFail("INTERNAL_ERROR", "Failed to load bias snapshot", 500);
  }
}
