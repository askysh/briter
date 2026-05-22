import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

import type { UploadManifest, UploadVariant } from "@/lib/uploads/upload-manifest";
import { computeDirectorySize, isNearCapacity } from "@/lib/uploads/budget";

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
    const widths = DEFAULT_WIDTHS.filter((width) => width <= originalWidth);
    const variantWidths = widths.length > 0 ? widths : [originalWidth || 800];
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

    const preferredVariant =
      variants.find((variant) => variant.width === 800 && variant.format === "webp") ??
      variants.find((variant) => variant.format === "webp") ??
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

  async getUsageBytes() {
    return computeDirectorySize(this.root);
  }
}
