export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { createAppServices } from "@/lib/app/services";
import { renderMarkdownPreview } from "@/lib/preview/markdown-preview";

export default async function PublishedPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { repository } = createAppServices();
  const post = await repository.getPost(slug);

  if (!post || post.status !== "published") {
    notFound();
  }

  const preview = await renderMarkdownPreview(post.body);

  return (
    <article className="article-shell">
      <div className="article-header">
        <p className="tiny">Published view</p>
        <h1>{post.frontmatter.title}</h1>
        <p className="page-subtitle">
          {post.frontmatter.publishedAt ?? "Unscheduled"} · {preview.readingTimeMinutes} min read
        </p>
      </div>
      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: preview.html }}
      />
    </article>
  );
}
