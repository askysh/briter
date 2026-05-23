import { describe, expect, test, beforeEach } from "bun:test";

// ---------------------------------------------------------------------------
// password.ts — hashPassword / verifyPassword
// ---------------------------------------------------------------------------
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword / verifyPassword", () => {
  test("hashed password verifies correctly", async () => {
    const hash = await hashPassword("super-secret-pw");
    expect(typeof hash).toBe("string");
    expect(hash.startsWith("$2")).toBe(true); // bcrypt prefix
    const ok = await verifyPassword("super-secret-pw", hash);
    expect(ok).toBe(true);
  });

  test("wrong password does not verify", async () => {
    const hash = await hashPassword("correct-password");
    const ok = await verifyPassword("wrong-password", hash);
    expect(ok).toBe(false);
  });

  test("two hashes of the same password differ (salted)", async () => {
    const h1 = await hashPassword("same-password");
    const h2 = await hashPassword("same-password");
    expect(h1).not.toBe(h2);
  });
});

// ---------------------------------------------------------------------------
// rate-limit.ts — isRateLimited
// ---------------------------------------------------------------------------
import { isRateLimited } from "@/lib/auth/rate-limit";

describe("isRateLimited", () => {
  // Use a unique key per test to avoid cross-test state bleed
  let key: string;
  beforeEach(() => {
    key = `test-${Date.now()}-${Math.random()}`;
  });

  test("first attempt is never rate-limited", () => {
    expect(isRateLimited(key)).toBe(false);
  });

  test("returns false while within the allowed attempt count", () => {
    // maxAttempts = 3, windowMs very large
    for (let i = 0; i < 3; i++) {
      expect(isRateLimited(key, 3, 60_000)).toBe(false);
    }
  });

  test("returns true once attempts exceed maxAttempts", () => {
    // Fill up to limit without tripping (attempts 1–8)
    for (let i = 0; i < 8; i++) {
      isRateLimited(key, 8, 60_000);
    }
    // 9th attempt exceeds limit
    expect(isRateLimited(key, 8, 60_000)).toBe(true);
  });

  test("resets after the window expires", async () => {
    isRateLimited(key, 1, 1); // 1 ms window — immediately expired
    await Bun.sleep(5);
    // Window has passed; counter should reset
    expect(isRateLimited(key, 1, 60_000)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// session.ts — createSessionToken / verifySessionToken
// (requires mocking getOrCreateSessionSecret via env / temp dir approach)
// ---------------------------------------------------------------------------
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

// session-secret calls loadSecrets / saveSecrets which reads from the fs.
// We seed a deterministic secret via the module mock-in-place pattern:
// Because bun:test doesn't support jest.mock top-level, we rely on the
// actual fs reading an empty secrets file, which causes getOrCreateSessionSecret
// to generate a new random secret and cache it for the process lifetime.
// What matters is that sign/verify round-trips correctly regardless of the secret.

describe("createSessionToken / verifySessionToken", () => {
  test("a freshly created token is valid", async () => {
    const token = await createSessionToken();
    expect(typeof token).toBe("string");
    expect(token.includes(".")).toBe(true);
    const valid = await verifySessionToken(token);
    expect(valid).toBe(true);
  });

  test("a tampered token is invalid", async () => {
    const token = await createSessionToken();
    const tampered = token.slice(0, -4) + "xxxx";
    const valid = await verifySessionToken(tampered);
    expect(valid).toBe(false);
  });

  test("a token with wrong structure is invalid", async () => {
    expect(await verifySessionToken("notavalidtoken")).toBe(false);
    expect(await verifySessionToken("")).toBe(false);
    expect(await verifySessionToken("a.b.c")).toBe(false);
  });
});
