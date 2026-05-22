import { NextResponse } from "next/server";

import { createAppServices } from "@/lib/app/services";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { uploads, env } = await createAppServices();
  const usedBytes = await uploads.getUsageBytes();
  return NextResponse.json({
    usedBytes,
    capBytes: env.uploadStorageLimitBytes,
  });
}
