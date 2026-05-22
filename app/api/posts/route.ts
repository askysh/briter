import { NextResponse } from "next/server";

import { createAppServices } from "@/lib/app/services";

export async function GET() {
  const { repository } = createAppServices();
  const posts = await repository.listPosts();

  return NextResponse.json(
    posts.map((post) => ({
      slug: post.slug,
      title: post.frontmatter.title,
      summary: post.frontmatter.summary,
      status: post.status,
      publishedAt: post.frontmatter.publishedAt,
      tags: post.frontmatter.tags,
      wordCount: post.wordCount,
    })),
  );
}
