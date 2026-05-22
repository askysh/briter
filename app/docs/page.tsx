export const dynamic = "force-dynamic";

const docs = [
  { slug: "product-philosophy", title: "Product Philosophy" },
  { slug: "architecture", title: "Architecture" },
  { slug: "local-development", title: "Local Development" },
  { slug: "v1-out-of-scope", title: "V1 Out of Scope" },
  { slug: "v1-roadmap", title: "V1 Roadmap" },
];

export default function DocsIndexPage() {
  return (
    <div className="section-stack">
      <section className="panel panel-strong" style={{ padding: "1.4rem" }}>
        <p className="tiny">Docs</p>
        <h1 className="page-title">Core notes for the scaffold.</h1>
        <p className="page-subtitle">
          Product guardrails, architecture boundaries, local setup, scope, and
          the first roadmap all live here as versioned markdown files.
        </p>
      </section>

      <section className="panel dashboard-list">
        {docs.map((doc) => (
          <article key={doc.slug} className="post-row">
            <div className="section-stack" style={{ gap: "0.3rem" }}>
              <a className="post-title" href={`/docs/${doc.slug}`}>
                {doc.title}
              </a>
              <span className="post-meta">Markdown file rendered through the app.</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
