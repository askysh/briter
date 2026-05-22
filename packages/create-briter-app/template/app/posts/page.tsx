export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";

import { createAppServices } from "@/lib/app/services";
import { resolvePublishedIndexHref } from "@/lib/adapters/published-href";

export default async function PostsPage() {
  const { repository, env, siteAdapter } = await createAppServices();
  if (siteAdapter.publicReader === "external") {
    const href = resolvePublishedIndexHref(env.publishedHrefTemplate);
    if (href) redirect(href);
  }
  const posts = (await repository.listPosts()).filter((p) => p.status === "published");

  return (
    <main className="page-shell">
      <section className="panel section-stack">
        <h1>Posts</h1>
        {posts.map((post) => (
          <article key={post.slug} className="post-row">
            <div className="section-stack" style={{ gap: "0.3rem" }}>
              <Link className="post-title" href={`/posts/${post.slug}`}>
                {post.frontmatter.title}
              </Link>
              <span className="post-meta">{post.frontmatter.summary}</span>
              <span className="tiny">{post.frontmatter.publishedAt}</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
