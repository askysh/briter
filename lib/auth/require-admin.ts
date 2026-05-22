import { NextResponse } from "next/server";

import { hasValidSessionCookie } from "@/lib/auth/session";

export async function requireAdmin() {
  const hasSession = await hasValidSessionCookie();
  if (!hasSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
