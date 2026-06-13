import { NextResponse } from "next/server";

import { enforceSameOrigin } from "@/lib/auth/csrf";
import { hasValidSessionCookie } from "@/lib/auth/session";

export async function requireAdmin() {
  const hasSession = await hasValidSessionCookie();
  if (!hasSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Guard for mutating admin routes: enforces the same-origin (CSRF) check
 * AND session auth. New mutating routes opt in with a single call:
 *
 *   const blocked = await requireAdminMutation(request);
 *   if (blocked) return blocked;
 *
 * Returns a `NextResponse` (403 or 401) to return early, or `null` to proceed.
 * See docs/decisions/002-csrf-posture.md.
 */
export async function requireAdminMutation(request: Request) {
  const forged = enforceSameOrigin(request);
  if (forged) return forged;
  return requireAdmin();
}
