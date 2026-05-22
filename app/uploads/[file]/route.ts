import { readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import { NextResponse } from "next/server";

import { createAppServices } from "@/lib/app/services";
import { isSafeUploadPath } from "@/lib/uploads/path-guard";

const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;

  if (!isSafeUploadPath(file)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { env } = createAppServices();
  const safeFileName = basename(file);
  const filePath = join(env.uploadRoot, safeFileName);

  try {
    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
