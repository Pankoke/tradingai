import { z, type ZodSchema } from "zod";

const TIMEOUT_MS = 10_000;

const apiResponseWrapper =
  <T>(schema: ZodSchema<T>) =>
  z.object({
    ok: z.literal(true),
    data: schema,
  });

const errorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export async function fetcher<T>(url: string, schema: ZodSchema<T>): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const wrapped = apiResponseWrapper(schema).safeParse(payload);
    if (wrapped.success) {
      return wrapped.data.data;
    }

    const errorPayload = errorResponseSchema.safeParse(payload);
    if (errorPayload.success) {
      const { code, message, details } = errorPayload.data.error;
      throw new Error(`Response error (${code}): ${message}${details ? ` [${JSON.stringify(details)}]` : ""}`);
    }

    const message = wrapped.error.issues
      .map((issue) => {
        const path = issue.path.join(".") || "(root)";
        return `${path}: ${issue.message}`;
      })
      .join("; ");
    throw new Error(`Response validation failed: ${message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
