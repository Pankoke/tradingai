import { NextResponse } from "next/server";
import { seedAssets } from "@/src/features/assets/seedAssets";

export async function POST(): Promise<NextResponse<{ ok: boolean; inserted?: number; updated?: number; error?: string }>> {
  try {
    const result = await seedAssets();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[assets/seed] error", error);
    return NextResponse.json({ ok: false, error: "Asset seeding failed" }, { status: 500 });
  }
}
