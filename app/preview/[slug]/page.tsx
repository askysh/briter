export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { PreviewFrame } from "@/components/preview-frame";
import { createAppServices } from "@/lib/app/services";
import { renderMarkdownPreview } from "@/lib/preview/markdown-preview";

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { slug } = await params;
  const { view } = await searchParams;
  const { repository } = await createAppServices();
  const post = await repository.getPost(slug);

  if (!post) {
    notFound();
  }

  const preview = await renderMarkdownPreview(post.body);

  return (
    <PreviewFrame
      slug={post.slug}
      title={post.frontmatter.title}
      summary={post.frontmatter.summary}
      publishedAt={post.frontmatter.publishedAt}
      tags={post.frontmatter.tags}
      status={post.status}
      html={preview.html}
      readingTimeMinutes={preview.readingTimeMinutes}
      view={view === "rss" ? "rss" : "site"}
    />
  );
}
