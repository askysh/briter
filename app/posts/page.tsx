export const dynamic = "force-dynamic";

import Link from "next/link";

import { createAppServices } from "@/lib/app/services";

export default async function PostsPage() {
  const { repository } = await createAppServices();
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
