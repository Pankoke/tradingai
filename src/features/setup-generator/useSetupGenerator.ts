import { setupGeneratorRequestSchema, setupGeneratorResponseSchema } from "@/src/features/setup-generator/types";

export async function fetchSetupGenerator(form: Parameters<typeof setupGeneratorRequestSchema.parse>[0]) {
  const body = setupGeneratorRequestSchema.parse(form);

  const response = await fetch("/api/setup-generator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch setup");
  }

  const json = await response.json();
  return setupGeneratorResponseSchema.parse(json);
}
