import { describe, expect, test } from "bun:test";

import { enforceSameOrigin } from "@/lib/auth/csrf";

// resolveBriterEnv() defaults publicBaseUrl to http://localhost:3075 when
// BRITER_PUBLIC_BASE_URL is unset, which is the trusted origin in these tests.
const TRUSTED = "http://localhost:3075";
const EVIL = "https://evil.example.com";

function req(
  method: string,
  headers: Record<string, string> = {},
  url = `${TRUSTED}/api/publish`,
): Request {
  return new Request(url, { method, headers });
}

describe("enforceSameOrigin", () => {
  test("safe methods (GET/HEAD/OPTIONS) always pass", () => {
    expect(enforceSameOrigin(req("GET", { origin: EVIL }))).toBeNull();
    expect(enforceSameOrigin(req("HEAD", { origin: EVIL }))).toBeNull();
    expect(enforceSameOrigin(req("OPTIONS", { origin: EVIL }))).toBeNull();
  });

  test("same-origin POST (Origin header) passes", () => {
    expect(enforceSameOrigin(req("POST", { origin: TRUSTED }))).toBeNull();
  });

  test("same-origin POST via Referer passes", () => {
    const r = enforceSameOrigin(req("POST", { referer: `${TRUSTED}/admin` }));
    expect(r).toBeNull();
  });

  test("cross-origin POST (forged Origin) is blocked with 403", async () => {
    const res = enforceSameOrigin(req("POST", { origin: EVIL }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    expect(await res!.json()).toEqual({ error: "Cross-origin request blocked" });
  });

  test("cross-origin POST via Referer is blocked with 403", () => {
    const res = enforceSameOrigin(req("POST", { referer: `${EVIL}/page` }));
    expect(res!.status).toBe(403);
  });

  test("POST with no Origin and no Referer is blocked with 403", () => {
    const res = enforceSameOrigin(req("POST", {}));
    expect(res!.status).toBe(403);
  });

  test("request's own host (x-forwarded-host) is trusted", () => {
    const r = enforceSameOrigin(
      req(
        "POST",
        {
          origin: "https://blog.example.com",
          "x-forwarded-host": "blog.example.com",
          "x-forwarded-proto": "https",
        },
        "https://blog.example.com/api/publish",
      ),
    );
    expect(r).toBeNull();
  });

  test("unsafe methods PUT/PATCH/DELETE are enforced", () => {
    expect(enforceSameOrigin(req("PUT", { origin: EVIL }))!.status).toBe(403);
    expect(enforceSameOrigin(req("PATCH", { origin: EVIL }))!.status).toBe(403);
    expect(enforceSameOrigin(req("DELETE", { origin: EVIL }))!.status).toBe(403);
  });
});
