import { NextResponse } from "next/server";

import { createAppServices } from "@/lib/app/services";
import { requireAdminMutation } from "@/lib/auth/require-admin";
import { PublishService } from "@/lib/publish/publish-service";

type ArchivePayload = {
  // true archives (site hides the post), false un-archives (restores it).
  // Both keep the .mdx file on disk — archiving is reversible, never a delete.
  archived: boolean;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // Mutating route: same-origin + admin session in one line (ADR 002 / G2).
  const blocked = await requireAdminMutation(request);
  if (blocked) return blocked;

  const { slug } = await params;
  const payload = (await request.json()) as ArchivePayload;

  const { repository, queue, siteAdapter, env } = await createAppServices();
  const existing = await repository.getPost(slug);

  if (!existing) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const service = new PublishService(
    repository,
    queue,
    siteAdapter,
    env.gitWorktreeRoot,
  );

  // Re-save the post verbatim with only the archived flag flipped. The file
  // stays on disk; the change syncs immediately (status "archived" is not a
  // future-scheduled state, so the queue pushes it now and the site hides it).
  const result = await service.save(
    {
      slug: existing.slug,
      title: existing.frontmatter.title,
      summary: existing.frontmatter.summary,
      body: existing.body,
      tags: existing.frontmatter.tags,
      draft: existing.frontmatter.draft,
      publishedAt: existing.frontmatter.publishedAt,
      archived: payload.archived,
    },
    payload.archived ? "archive" : "unarchive",
  );

  return NextResponse.json({
    slug: result.post.slug,
    status: result.post.status,
    archived: result.post.frontmatter.archived === true,
  });
}
