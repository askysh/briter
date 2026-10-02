import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

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

// Upload markdown points at `${uploadRouteBase}/<file>`. The route base can be
// nested (e.g. `/uploads/notes` to match a site's public path), so this route
// catches every depth and serves the file only at the configured base or at
// the legacy `/uploads/<file>` path.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const file = path.at(-1) ?? "";
  const { env } = await createAppServices();
  const requested = `/uploads/${path.join("/")}`;
  const isServedPath =
    requested === `/uploads/${file}` ||
    requested === `${env.uploadRouteBase.replace(/\/+$/, "")}/${file}`;

  if (!isServedPath || !isSafeUploadPath(file)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = join(env.uploadRoot, file);

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
