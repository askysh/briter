export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { PreviewFrame } from "@/components/preview-frame";
import { createAppServices } from "@/lib/app/services";
import { hasValidSessionCookie } from "@/lib/auth/session";
import { renderMarkdownPreview } from "@/lib/preview/markdown-preview";
import { verifyPreviewToken } from "@/lib/preview/preview-token";

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; token?: string }>;
}) {
  const { slug } = await params;
  const { view, token } = await searchParams;
  const { repository } = await createAppServices();
  const post = await repository.getPost(slug);

  if (!post) {
    notFound();
  }

  if (post.status !== "published") {
    const hasSession = await hasValidSessionCookie();
    const hasValidToken = token ? await verifyPreviewToken(token, slug) : false;
    if (!hasSession && !hasValidToken) {
      notFound();
    }
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
