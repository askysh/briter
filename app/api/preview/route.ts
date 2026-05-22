import { NextResponse } from "next/server";

import { renderMarkdownPreview } from "@/lib/preview/markdown-preview";

export async function POST(request: Request) {
  const { body } = (await request.json()) as { body?: string };
  const preview = await renderMarkdownPreview(body ?? "");

  return NextResponse.json(preview);
}
