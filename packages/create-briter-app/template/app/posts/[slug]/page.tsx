export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { createAppServices } from "@/lib/app/services";
import { getSiteIdentity } from "@/lib/public/site-identity";
import { renderMarkdownPreview } from "@/lib/preview/markdown-preview";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [{ repository }, site] = await Promise.all([
    createAppServices(),
    getSiteIdentity(),
  ]);
  const post = await repository.getPost(slug);
  if (!post) return {};

  const url = `${site.baseUrl}/posts/${post.slug}`;
  return {
    title: post.frontmatter.title,
    description: post.frontmatter.summary,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.frontmatter.title,
      description: post.frontmatter.summary,
    },
    twitter: {
      card: "summary_large_image",
      title: post.frontmatter.title,
      description: post.frontmatter.summary,
    },
  };
}

export default async function PublishedPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { repository } = await createAppServices();
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
