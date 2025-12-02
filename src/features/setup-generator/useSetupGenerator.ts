import { formStateSchema, setupResponseSchema } from "@/src/features/setup-generator/types";

export async function fetchSetupGenerator(form: Parameters<typeof formStateSchema.parse>[0]) {
  const body = formStateSchema.parse(form);

  const response = await fetch("/api/setup-generator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch setup");
  }

  const json = await response.json();
  const parsed = setupResponseSchema.parse(json);
  return {
    ...parsed.setup,
    validUntil: new Date(parsed.setup.validUntil),
  };
}
