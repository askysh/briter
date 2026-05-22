import { NextResponse } from "next/server";

import { createAppServices } from "@/lib/app/services";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { repository } = createAppServices();
  const post = await repository.getPost(slug);

  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json(post);
}
