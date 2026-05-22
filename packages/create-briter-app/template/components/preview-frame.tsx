import { StatusPill } from "@/components/status-pill";
import type { PostStatus } from "@/lib/content/types";

export function PreviewFrame({
  slug,
  title,
  summary,
  publishedAt,
  tags,
  status,
  html,
  readingTimeMinutes,
  view,
}: {
  slug: string;
  title: string;
  summary: string;
  publishedAt?: string;
  tags: string[];
  status: PostStatus;
  html: string;
  readingTimeMinutes: number;
  view: "site" | "rss";
}) {
  const itemXml = `<item>
  <title>${title}</title>
  <link>/posts/${slug}</link>
  <description>${summary}</description>
  <pubDate>${publishedAt ?? "draft"}</pubDate>
</item>`;

  return (
    <article className="article-shell">
      <div className="preview-frame-chrome">
        <div className="button-row" style={{ marginBottom: "1rem" }}>
          <StatusPill status={status} />
          <a
            className={`button ${view === "site" ? "button-primary" : "button-secondary"}`}
            href={`/preview/${slug}`}
          >
            Site view
          </a>
          <a
            className={`button ${view === "rss" ? "button-primary" : "button-secondary"}`}
            href={`/preview/${slug}?view=rss`}
          >
            RSS view
          </a>
        </div>
      </div>

      {view === "site" ? (
        <>
          <div className="article-header preview-frame-chrome">
            <p className="tiny">Full preview</p>
            <h1>{title}</h1>
            <p className="page-subtitle">
              {publishedAt ?? "Not scheduled yet"} · {readingTimeMinutes} min read
            </p>
          </div>

          <div
            className="prose"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </>
      ) : (
        <section className="panel rss-card section-stack preview-frame-chrome">
          <div>
            <p className="tiny">RSS reader mock</p>
            <h2 style={{ margin: 0, fontFamily: "var(--briter-font-body)", fontSize: "2rem" }}>
              {title}
            </h2>
            <p className="page-subtitle">{summary}</p>
          </div>

          <p className="tiny">
            {publishedAt ?? "draft"} · tags: {tags.join(", ") || "none"}
          </p>

          <div className="code-block">{itemXml}</div>
        </section>
      )}
    </article>
  );
}
