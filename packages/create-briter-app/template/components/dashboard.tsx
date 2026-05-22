import Link from "next/link";

import type { PostDocument } from "@/lib/content/types";
import { StatusPill } from "@/components/status-pill";

export function Dashboard({
  posts,
  queueSummary,
}: {
  posts: PostDocument[];
  queueSummary: { pending: number; failed: number };
}) {
  return (
    <div className="section-stack">
      <section className="panel panel-strong hero">
        <div className="section-stack">
          <p className="tiny">Standalone scaffold</p>
          <h1>Shorten the distance between thinking and publishing.</h1>
          <p>
            Briter stays opinionated on purpose: Markdown and MDX stay in your
            repo, images are part of the core writing loop, and git sync runs
            behind a worker boundary instead of inside the writing surface.
          </p>
          <div className="button-row">
            <Link className="button button-primary" href="/write/new">
              Start writing
            </Link>
            <Link className="button button-secondary" href="/docs/architecture">
              Read architecture
            </Link>
          </div>
        </div>

        <div className="metric-grid">
          <div className="panel metric">
            <div className="metric-label">Posts</div>
            <div className="metric-value">{posts.length}</div>
          </div>
          <div className="panel metric">
            <div className="metric-label">Queued sync jobs</div>
            <div className="metric-value">{queueSummary.pending}</div>
          </div>
          <div className="panel metric">
            <div className="metric-label">Retrying jobs</div>
            <div className="metric-value">{queueSummary.failed}</div>
          </div>
        </div>
      </section>

      <section className="panel dashboard-list">
        <div className="split-note">
          <div>
            <h2 className="page-title" style={{ fontSize: "2rem" }}>
              Posts
            </h2>
            <p className="page-subtitle">
              Drafts, scheduled posts, and published notes all stay in plain
              files under version control.
            </p>
          </div>
        </div>

        {posts.map((post) => (
          <article key={post.slug} className="post-row">
            <div className="section-stack" style={{ gap: "0.3rem" }}>
              <a className="post-title" href={`/write/${post.slug}`}>
                {post.frontmatter.title}
              </a>
              <span className="post-meta">
                {post.frontmatter.summary || "No summary yet."}
              </span>
              <span className="tiny">
                {post.frontmatter.publishedAt ?? "Unscheduled"} · {post.wordCount} words
              </span>
            </div>

            <StatusPill status={post.status} />

            <div className="button-row">
              <a className="button button-ghost" href={`/preview/${post.slug}`}>
                Preview
              </a>
              <a className="button button-secondary" href={`/write/${post.slug}`}>
                Edit
              </a>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
