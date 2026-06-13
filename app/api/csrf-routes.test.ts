import { describe, expect, test } from "bun:test";

// Verifies that EVERY existing mutating admin route rejects a forged
// cross-origin request. The same-origin (CSRF) check runs first in each
// handler, so a forged request is blocked with 403 before any session,
// rate-limit, or business logic runs — no session cookie is needed here.
//
// See docs/decisions/002-csrf-posture.md.

import { POST as publish } from "@/app/api/publish/route";
import { POST as runtime } from "@/app/api/settings/runtime/route";
import { POST as theme } from "@/app/api/settings/theme/route";
import { POST as themePreview } from "@/app/api/settings/theme/preview/route";
import { POST as uploads } from "@/app/api/uploads/route";
import { POST as setup } from "@/app/api/setup/route";
import { POST as login } from "@/app/api/login/route";
import { POST as logout } from "@/app/api/logout/route";
import { POST as preview } from "@/app/api/preview/route";
import { POST as previewShare } from "@/app/api/preview/share/route";

const EVIL = "https://evil.example.com";
// The request arrives at OUR server (its own host is the trusted origin,
// http://localhost:3075 by default), but the Origin header points at the
// attacker's page — the real CSRF scenario.
const SELF = "http://localhost:3075";

function forgedRequest(path: string): Request {
  return new Request(`${SELF}${path}`, {
    method: "POST",
    headers: { origin: EVIL, "content-type": "application/json" },
    body: JSON.stringify({}),
  });
}

const routes: Array<[string, (req: Request) => Promise<Response>, string]> = [
  ["POST /api/publish", publish, "/api/publish"],
  ["POST /api/settings/runtime", runtime, "/api/settings/runtime"],
  ["POST /api/settings/theme", theme, "/api/settings/theme"],
  ["POST /api/settings/theme/preview", themePreview, "/api/settings/theme/preview"],
  ["POST /api/uploads", uploads, "/api/uploads"],
  ["POST /api/setup", setup, "/api/setup"],
  ["POST /api/login", login, "/api/login"],
  ["POST /api/logout", logout, "/api/logout"],
  ["POST /api/preview", preview, "/api/preview"],
  ["POST /api/preview/share", previewShare, "/api/preview/share"],
];

describe("CSRF: mutating admin routes reject forged cross-origin requests", () => {
  for (const [name, handler, path] of routes) {
    test(`${name} → 403 on cross-origin POST`, async () => {
      const res = await handler(forgedRequest(path));
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error?: string };
      expect(body.error).toBe("Cross-origin request blocked");
    });
  }
});
