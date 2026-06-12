import Link from "next/link";

import type { PostDocument } from "@/lib/content/types";
import { StorageUsageBar } from "@/components/admin/storage-usage-bar";
import { StatusPill } from "@/components/status-pill";

function formatDate(value?: string): string {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function Dashboard({
  posts,
  queueSummary,
  storageUsage,
}: {
  posts: PostDocument[];
  queueSummary: { pending: number; failed: number };
  storageUsage: { usedBytes: number; capBytes: number };
}) {
  const drafts = posts.filter((post) => post.status === "draft").length;
  const published = posts.filter((post) => post.status === "published").length;

  return (
    <div className="section-stack dashboard">
      <header className="dashboard-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {published} published · {drafts} draft{drafts === 1 ? "" : "s"}
            {queueSummary.pending > 0
              ? ` · ${queueSummary.pending} sync job${queueSummary.pending === 1 ? "" : "s"} queued`
              : ""}
          </p>
        </div>
        <Link className="button button-primary" href="/write/new">
          New post
        </Link>
      </header>

      <div className="stat-strip">
        <div className="panel stat-card">
          <span className="metric-label">Posts</span>
          <span className="metric-value">{posts.length}</span>
        </div>
        <div className="panel stat-card">
          <span className="metric-label">Queued sync</span>
          <span className="metric-value">{queueSummary.pending}</span>
        </div>
        <div className="panel stat-card">
          <span className="metric-label">Retrying</span>
          <span className="metric-value">{queueSummary.failed}</span>
        </div>
        <div className="panel stat-card stat-card-wide">
          <StorageUsageBar
            usedBytes={storageUsage.usedBytes}
            capBytes={storageUsage.capBytes}
          />
        </div>
      </div>

      <section className="panel dashboard-list">
        <div className="dashboard-list-head">
          <h2 className="dashboard-list-title">Posts</h2>
        </div>

        {posts.length === 0 ? (
          <div className="dashboard-empty">
            <p>Nothing here yet.</p>
            <Link className="button button-primary" href="/write/new">
              Write your first post
            </Link>
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.slug} className="post-row">
              <div className="post-row-main">
                <Link className="post-title" href={`/write/${post.slug}`}>
                  {post.frontmatter.title}
                </Link>
                {post.frontmatter.summary ? (
                  <span className="post-meta">{post.frontmatter.summary}</span>
                ) : null}
                <span className="tiny">
                  {formatDate(post.frontmatter.publishedAt)} · {post.wordCount}{" "}
                  words
                </span>
              </div>

              <StatusPill status={post.status} />

              <div className="button-row">
                <a className="button button-ghost" href={`/preview/${post.slug}`}>
                  Preview
                </a>
                <Link
                  className="button button-secondary"
                  href={`/write/${post.slug}`}
                >
                  Edit
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
