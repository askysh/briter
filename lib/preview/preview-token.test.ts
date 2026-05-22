import { describe, expect, test } from "bun:test";

import { createPreviewToken, verifyPreviewToken } from "@/lib/preview/preview-token";

describe("createPreviewToken / verifyPreviewToken", () => {
  test("generated token verifies for the correct slug", async () => {
    const token = await createPreviewToken("my-test-post");
    expect(typeof token).toBe("string");
    const valid = await verifyPreviewToken(token, "my-test-post");
    expect(valid).toBe(true);
  });

  test("token does not verify for a different slug", async () => {
    const token = await createPreviewToken("post-a");
    const valid = await verifyPreviewToken(token, "post-b");
    expect(valid).toBe(false);
  });

  test("expired token is rejected", async () => {
    // ttlMs = 1 ms → expires essentially immediately
    const token = await createPreviewToken("expiring-post", 1);
    await Bun.sleep(10); // ensure expiry
    const valid = await verifyPreviewToken(token, "expiring-post");
    expect(valid).toBe(false);
  });

  test("tampered signature is rejected", async () => {
    const token = await createPreviewToken("my-post");
    const tampered = token.slice(0, -4) + "zzzz";
    expect(await verifyPreviewToken(tampered, "my-post")).toBe(false);
  });

  test("malformed token (missing dot) is rejected", async () => {
    expect(await verifyPreviewToken("nodottoken", "slug")).toBe(false);
  });

  test("token with corrupted base64 payload is rejected gracefully", async () => {
    const token = await createPreviewToken("my-post");
    const [, sig] = token.split(".");
    // Replace payload with garbage
    const bad = `!!!notbase64!!!.${sig}`;
    expect(await verifyPreviewToken(bad, "my-post")).toBe(false);
  });
});
