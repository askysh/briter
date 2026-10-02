import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

import sharp from "sharp";

import type { UploadManifest, UploadVariant } from "@/lib/uploads/upload-manifest";
import { computeDirectorySize, isNearCapacity } from "@/lib/uploads/budget";
import { isSafeUploadPath } from "@/lib/uploads/path-guard";

const DEFAULT_WIDTHS = [400, 800, 1200, 1600];
const SUPPORTED_INPUT_FORMATS = new Set(["jpeg", "png", "webp", "avif", "gif"]);
const MAX_DIMENSION = 8000;
const MAX_PIXELS = 24_000_000;

export class UploadLimitError extends Error {}

export class ImageUploadService {
  constructor(
    private readonly root: string,
    private readonly publicRouteBase: string,
    private readonly storageLimitBytes: number,
  ) {}

  async store(file: File) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const usage = await this.getUsageBytes();

    if (usage + buffer.byteLength > this.storageLimitBytes) {
      throw new UploadLimitError("Upload storage limit exceeded.");
    }
    if (isNearCapacity(usage + buffer.byteLength, this.storageLimitBytes)) {
      throw new UploadLimitError("Upload storage is near capacity (95% soft cap).");
    }

    await mkdir(this.root, { recursive: true });

    const hash = createHash("sha256").update(buffer).digest("hex");
    const image = sharp(buffer).rotate();
    const metadata = await image.metadata();
    if (!metadata.format || !SUPPORTED_INPUT_FORMATS.has(metadata.format)) {
      throw new Error("Unsupported image format.");
    }
    const originalWidth = metadata.width ?? 0;
    const originalHeight = metadata.height ?? 0;
    if (!originalWidth || !originalHeight) {
      throw new Error("Could not detect image dimensions.");
    }
    if (
      originalWidth > MAX_DIMENSION ||
      originalHeight > MAX_DIMENSION ||
      originalWidth * originalHeight > MAX_PIXELS
    ) {
      throw new Error("Image dimensions exceed allowed limits.");
    }
    // Keep a full-resolution variant: a 768px image gets 400 + 768, not just
    // a 400px downscale. Images wider than the largest default cap at it.
    const largestWidth = Math.min(originalWidth, DEFAULT_WIDTHS[DEFAULT_WIDTHS.length - 1]);
    const variantWidths = [
      ...DEFAULT_WIDTHS.filter((width) => width < largestWidth),
      largestWidth,
    ];
    const variants: UploadVariant[] = [];

    for (const width of variantWidths) {
      for (const format of ["avif", "webp"] as const) {
        const fileName = `${hash}-${width}.${format}`;
        const filePath = join(this.root, fileName);
        const exists = await stat(filePath).then(
          () => true,
          () => false,
        );

        if (!exists) {
          const output = await image
            .clone()
            .resize({ width, withoutEnlargement: true })
            [format]({ quality: 72 })
            .toBuffer();

          await writeFile(filePath, output);
        }

        const bytes = (await stat(filePath)).size;
        variants.push({ width, format, fileName, bytes });
      }
    }

    const manifest: UploadManifest = {
      id: hash,
      originalWidth,
      originalHeight,
      variants,
    };

    await writeFile(
      join(this.root, `${hash}.json`),
      JSON.stringify(manifest, null, 2),
      "utf8",
    );

    const webpVariants = variants.filter((variant) => variant.format === "webp");
    const preferredVariant =
      webpVariants.find((variant) => variant.width === 800) ??
      webpVariants[webpVariants.length - 1] ??
      variants[0];

    if (!preferredVariant) {
      throw new Error("No upload variants were generated.");
    }

    return {
      manifest,
      markdown: `![${file.name || "image"}](${this.publicRouteBase}/${preferredVariant.fileName})`,
      publicPath: `${this.publicRouteBase}/${preferredVariant.fileName}`,
      relativePaths: [
        ...variants.map((variant) => variant.fileName),
        `${hash}.json`,
      ],
    };
  }

  async readAsset(fileName: string) {
    return readFile(join(this.root, fileName));
  }

  /**
   * Worktree-relative paths of every stored file (all variants plus the
   * manifest) for uploads the post body references, so a git sync commits a
   * post's images together with the post.
   */
  async referencedAssetPaths(body: string, worktreeRoot: string) {
    const base = this.publicRouteBase.replace(/\/+$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const references = body.matchAll(new RegExp(`${base}/([^\\s)"'<>]+)`, "g"));
    const hashes = new Set<string>();
    for (const [, fileName] of references) {
      if (isSafeUploadPath(fileName)) hashes.add(fileName.split(/[-.]/)[0]);
    }

    const paths: string[] = [];
    for (const hash of hashes) {
      const manifestPath = join(this.root, `${hash}.json`);
      try {
        const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as UploadManifest;
        paths.push(
          ...manifest.variants.map((variant) => join(this.root, variant.fileName)),
          manifestPath,
        );
      } catch {
        // Unknown or foreign upload: nothing of ours to commit.
      }
    }
    return paths.map((path) => relative(worktreeRoot, path));
  }

  async getUsageBytes() {
    return computeDirectorySize(this.root);
  }
}
