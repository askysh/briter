import { NextResponse } from "next/server";

import { createAppServices } from "@/lib/app/services";
import { requireAdminMutation } from "@/lib/auth/require-admin";
import { createPreviewToken } from "@/lib/preview/preview-token";

export async function POST(request: Request) {
  const unauthorized = await requireAdminMutation(request);
  if (unauthorized) return unauthorized;

  const { slug } = (await request.json()) as { slug?: string };
  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  const { repository, env } = await createAppServices();
  const post = await repository.getPost(slug);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const token = await createPreviewToken(slug);
  const url = `${env.publicBaseUrl}/preview/${slug}?token=${encodeURIComponent(token)}`;
  return NextResponse.json({ url, expiresInHours: 24 });
}
