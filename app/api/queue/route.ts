import { NextResponse } from "next/server";

import { createAppServices } from "@/lib/app/services";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { queue } = await createAppServices();
  return NextResponse.json(await queue.getSummary());
}
