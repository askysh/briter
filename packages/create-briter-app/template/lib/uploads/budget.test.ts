import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import { computeDirectorySize, isNearCapacity } from "@/lib/uploads/budget";

describe("computeDirectorySize", () => {
  test("counts uploads nested in subfolders (recursion fix)", async () => {
    const root = await mkdtemp(join(tmpdir(), "briter-budget-"));

    // top-level file
    await writeFile(join(root, "top.bin"), Buffer.alloc(100));

    // nested upload dir with files
    const nested = join(root, "posts", "2026");
    await mkdir(nested, { recursive: true });
    await writeFile(join(nested, "a.bin"), Buffer.alloc(250));
    await writeFile(join(nested, "b.bin"), Buffer.alloc(400));

    const total = await computeDirectorySize(root);
    // 100 + 250 + 400 = 750; pre-fix code returned only the 100 top-level byte
    expect(total).toBe(750);
  });

  test("returns 0 for an empty directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "briter-budget-empty-"));
    expect(await computeDirectorySize(root)).toBe(0);
  });
});

describe("isNearCapacity", () => {
  test("flags at or above 95% of the cap", () => {
    expect(isNearCapacity(95, 100)).toBe(true);
    expect(isNearCapacity(94, 100)).toBe(false);
  });
});
