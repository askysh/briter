/**
 * Tests for ImageUploadService (image-pipeline equivalent).
 * Uses sharp to generate real small JPEG/PNG buffers in temp directories.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";

import { ImageUploadService, UploadLimitError } from "@/lib/uploads/image-upload-service";

let uploadRoot: string;
let service: ImageUploadService;
const LIMIT = 100 * 1024 * 1024; // 100 MB for tests

beforeEach(async () => {
  uploadRoot = join(
    tmpdir(),
    `briter-upload-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(uploadRoot, { recursive: true });
  service = new ImageUploadService(uploadRoot, "/uploads", LIMIT);
});

afterEach(async () => {
  await rm(uploadRoot, { recursive: true, force: true });
});

/** Build a minimal valid JPEG buffer via sharp */
async function makeJpegFile(width = 100, height = 100, name = "test.jpg"): Promise<File> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 128, g: 0, b: 128 } },
  })
    .jpeg()
    .toBuffer();
  return new File([buffer], name, { type: "image/jpeg" });
}

/** Build a minimal valid PNG buffer via sharp */
async function makePngFile(width = 200, height = 200, name = "test.png"): Promise<File> {
  const buffer = await sharp({
    create: { width, height, channels: 4, background: { r: 255, g: 128, b: 0, alpha: 1 } },
  })
    .png()
    .toBuffer();
  return new File([buffer], name, { type: "image/png" });
}

describe("ImageUploadService.store", () => {
  test("stores a valid JPEG and returns markdown + publicPath", async () => {
    const file = await makeJpegFile();
    const result = await service.store(file);
    expect(result.markdown).toMatch(/!\[.*\]\(\/uploads\//);
    expect(result.publicPath).toStartWith("/uploads/");
    expect(result.manifest.variants.length).toBeGreaterThan(0);
  });

  test("stores a valid PNG and generates avif+webp variants", async () => {
    const file = await makePngFile();
    const result = await service.store(file);
    const formats = result.manifest.variants.map((v) => v.format);
    expect(formats).toContain("webp");
    expect(formats).toContain("avif");
  });

  test("returns relativePaths that include the manifest JSON", async () => {
    const file = await makeJpegFile();
    const result = await service.store(file);
    const jsonPath = result.relativePaths.find((p) => p.endsWith(".json"));
    expect(jsonPath).toBeDefined();
  });

  test("throws UploadLimitError when the buffer alone exceeds the storage limit", async () => {
    const tinyService = new ImageUploadService(uploadRoot, "/uploads", 1); // 1 byte limit
    const file = await makeJpegFile();
    void expect(service.store.bind(tinyService, file)).toThrow;
    await expect(tinyService.store(file)).rejects.toBeInstanceOf(UploadLimitError);
  });

  test("throws for an unsupported file format (plain text masquerading as image)", async () => {
    const fakeFile = new File(["not an image"], "bad.txt", { type: "text/plain" });
    await expect(service.store(fakeFile)).rejects.toThrow();
  });

  test("deduplicates identical uploads (same hash → skips re-encoding)", async () => {
    const file1 = await makeJpegFile(50, 50, "img1.jpg");
    const r1 = await service.store(file1);
    const file2 = await makeJpegFile(50, 50, "img2.jpg"); // identical pixel content
    const r2 = await service.store(file2);
    // Both should resolve to the same hash-based paths
    expect(r1.manifest.id).toBe(r2.manifest.id);
  });
});

describe("ImageUploadService.getUsageBytes", () => {
  test("returns 0 for an empty directory", async () => {
    const emptyService = new ImageUploadService(uploadRoot, "/uploads", LIMIT);
    const usage = await emptyService.getUsageBytes();
    expect(usage).toBe(0);
  });

  test("returns non-zero after an upload", async () => {
    const file = await makeJpegFile();
    await service.store(file);
    const usage = await service.getUsageBytes();
    expect(usage).toBeGreaterThan(0);
  });
});

describe("ImageUploadService variant widths", () => {
  test("keeps a full-width variant for an image between default widths", async () => {
    const result = await service.store(await makeJpegFile(768, 1024));
    const widths = [...new Set(result.manifest.variants.map((v) => v.width))];
    expect(widths).toEqual([400, 768]);
    expect(result.publicPath).toEndWith("-768.webp");
  });

  test("caps wide images at the largest default width", async () => {
    const result = await service.store(await makeJpegFile(2000, 100));
    const widths = [...new Set(result.manifest.variants.map((v) => v.width))];
    expect(widths).toEqual([400, 800, 1200, 1600]);
    expect(result.publicPath).toEndWith("-800.webp");
  });
});

describe("ImageUploadService.referencedAssetPaths", () => {
  test("returns every stored file for uploads the body references", async () => {
    const nested = new ImageUploadService(uploadRoot, "/uploads/notes", LIMIT);
    const result = await nested.store(await makeJpegFile(500, 500));
    const body = `Intro\n\n${result.markdown}\n\n![x](/uploads/notes/${"f".repeat(64)}-400.webp)`;

    const paths = await nested.referencedAssetPaths(body, join(uploadRoot, ".."));

    const expected = [
      ...result.manifest.variants.map((v) => v.fileName),
      `${result.manifest.id}.json`,
    ].map((name) => join(uploadRoot.split("/").pop()!, name));
    expect(paths.sort()).toEqual(expected.sort());
  });
});
