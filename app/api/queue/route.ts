import { NextResponse } from "next/server";

import { createAppServices } from "@/lib/app/services";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { queue } = await createAppServices();
  const [summary, scheduled] = await Promise.all([
    queue.getSummary(),
    queue.listScheduled(),
  ]);

  // Clean JSON, forward-compat for a future token client: counts plus the
  // upcoming scheduled posts (slug + publish instant) the dashboard lists.
  return NextResponse.json({ ...summary, scheduled });
}
