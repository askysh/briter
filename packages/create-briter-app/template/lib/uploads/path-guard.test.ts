import { describe, expect, test } from "bun:test";

import { isSafeUploadPath } from "@/lib/uploads/path-guard";

describe("isSafeUploadPath", () => {
  test("accepts hashed upload asset names", () => {
    expect(
      isSafeUploadPath("2d4f95c0a79a72fd5334d8b3a28b241e-800.webp"),
    ).toBe(true);
  });

  test("rejects traversal attempts", () => {
    expect(isSafeUploadPath("../secret.txt")).toBe(false);
  });

  test("rejects unsupported extensions", () => {
    expect(isSafeUploadPath("2d4f95c0a79a72fd5334d8b3a28b241e-800.exe")).toBe(
      false,
    );
  });
});
