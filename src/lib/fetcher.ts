// TODO: implementieren
import type { ZodSchema } from "zod";

const TIMEOUT_MS = 10_000;

export async function fetcher<T>(url: string, schema: ZodSchema<T>): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => {
          const path = issue.path.join(".") || "(root)";
          return `${path}: ${issue.message}`;
        })
        .join("; ");
      throw new Error(`Response validation failed: ${message}`);
    }

    return parsed.data;
  } finally {
    clearTimeout(timeoutId);
  }
}
