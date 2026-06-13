import { NextResponse } from "next/server";

import { enforceSameOrigin } from "@/lib/auth/csrf";
import { renderMarkdownPreview } from "@/lib/preview/markdown-preview";

export async function POST(request: Request) {
  const forged = enforceSameOrigin(request);
  if (forged) return forged;

  const { body } = (await request.json()) as { body?: string };
  const preview = await renderMarkdownPreview(body ?? "");

  return NextResponse.json(preview);
}
