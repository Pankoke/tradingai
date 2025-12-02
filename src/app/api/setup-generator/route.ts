import { NextRequest, NextResponse } from "next/server";
import { formStateSchema, setupResponseSchema } from "@/src/features/setup-generator/types";
import { generateSetupFromMockEngine } from "@/src/server/services/setupGeneratorService";
import { generateSetupFromEngine } from "@/src/server/services/setupGeneratorEngine";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const parsed = formStateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  let setup;
  try {
    setup = await generateSetupFromEngine(parsed.data);
  } catch (err) {
    console.error("Engine generation failed, falling back to mock", err);
    setup = await generateSetupFromMockEngine(parsed.data);
  }
  const payload = setupResponseSchema.parse({
    setup: { ...setup, validUntil: setup.validUntil.toISOString() },
  });
  return NextResponse.json(payload);
}
