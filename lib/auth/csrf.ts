import { NextResponse } from "next/server";

import { resolveBriterEnv } from "@/lib/config/env";

/**
 * CSRF posture for Briter — see docs/decisions/002-csrf-posture.md.
 *
 * Mutating admin routes are protected by a same-origin check (Origin /
 * Referer validation) layered on top of the SameSite=Lax session cookie.
 * The browser sets the `Origin` header automatically on unsafe cross-origin
 * requests and scripts cannot forge it, which makes this a sound CSRF defense
 * for a cookie-session app without introducing a token lifecycle.
 */

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function originOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Origins the server trusts for mutating requests:
 *  - the request's own host (honoring reverse-proxy forwarded headers), and
 *  - the configured public base URL (BRITER_PUBLIC_BASE_URL).
 */
function trustedOrigins(request: Request): Set<string> {
  const origins = new Set<string>();

  const configured = originOf(resolveBriterEnv().publicBaseUrl);
  if (configured) origins.add(configured);

  const headers = request.headers;
  const forwardedHost = headers.get("x-forwarded-host") ?? headers.get("host");
  if (forwardedHost) {
    const proto =
      headers.get("x-forwarded-proto") ??
      originOf(request.url)?.split(":")[0] ??
      "http";
    const self = originOf(`${proto}://${forwardedHost}`);
    if (self) origins.add(self);
  }

  const selfFromUrl = originOf(request.url);
  if (selfFromUrl) origins.add(selfFromUrl);

  return origins;
}

/**
 * Reject cross-origin mutating requests (CSRF defense).
 *
 * Returns a 403 `NextResponse` when the request is an unsafe method whose
 * Origin/Referer does not match a trusted origin (or sends neither). Returns
 * `null` when the request is safe to proceed. Safe methods always pass.
 */
export function enforceSameOrigin(request: Request): NextResponse | null {
  if (!UNSAFE_METHODS.has(request.method.toUpperCase())) {
    return null;
  }

  const requestOrigin =
    originOf(request.headers.get("origin")) ??
    originOf(request.headers.get("referer"));

  // An unsafe method with no Origin and no Referer is treated as forged:
  // legitimate same-origin browser mutations always carry at least one.
  if (!requestOrigin) {
    return NextResponse.json(
      { error: "Cross-origin request blocked" },
      { status: 403 },
    );
  }

  if (!trustedOrigins(request).has(requestOrigin)) {
    return NextResponse.json(
      { error: "Cross-origin request blocked" },
      { status: 403 },
    );
  }

  return null;
}
