import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { senseDiskUsage } from "@/lib/uploads/disk-usage";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "briter-disk-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("senseDiskUsage", () => {
  test("reports real total/free/used disk for an existing path", async () => {
    const usage = await senseDiskUsage(dir);
    expect(usage).not.toBeNull();
    if (!usage) return;
    expect(usage.totalBytes).toBeGreaterThan(0);
    expect(usage.freeBytes).toBeGreaterThan(0);
    expect(usage.freeBytes).toBeLessThanOrEqual(usage.totalBytes);
    expect(usage.usedBytes).toBe(usage.totalBytes - usage.freeBytes);
  });

  test("creates a missing path then senses its volume", async () => {
    const nested = join(dir, "uploads", "posts");
    const usage = await senseDiskUsage(nested);
    expect(usage).not.toBeNull();
    expect(usage?.totalBytes).toBeGreaterThan(0);
  });
});
