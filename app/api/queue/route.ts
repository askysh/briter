import { NextResponse } from "next/server";

import { createAppServices } from "@/lib/app/services";

export async function GET() {
  const { queue } = createAppServices();
  return NextResponse.json(await queue.getSummary());
}
