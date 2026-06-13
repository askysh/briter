import { NextResponse } from "next/server";

import { createAppServices } from "@/lib/app/services";
import { requireAdmin } from "@/lib/auth/require-admin";
import { senseDiskUsage } from "@/lib/uploads/disk-usage";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { uploads, env } = await createAppServices();
  const [usedBytes, disk] = await Promise.all([
    uploads.getUsageBytes(),
    senseDiskUsage(env.uploadRoot),
  ]);

  return NextResponse.json({
    // Self-imposed budget: how much of the provisioned cap is consumed.
    usedBytes,
    capBytes: env.uploadStorageLimitBytes,
    // Physical headroom on the data volume (null if sensing failed).
    disk: disk
      ? {
          totalBytes: disk.totalBytes,
          freeBytes: disk.freeBytes,
          usedBytes: disk.usedBytes,
        }
      : null,
  });
}
