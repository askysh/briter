export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { PostEditor } from "@/components/post-editor";
import { createAppServices } from "@/lib/app/services";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { repository } = createAppServices();
  const post = await repository.getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <PostEditor
      initialPost={{
        slug: post.slug,
        title: post.frontmatter.title,
        summary: post.frontmatter.summary,
        body: post.body,
        tags: post.frontmatter.tags,
        draft: post.frontmatter.draft,
        publishedAt: post.frontmatter.publishedAt,
      }}
    />
  );
}
