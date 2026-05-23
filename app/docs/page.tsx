export const dynamic = "force-dynamic";

import { join } from "node:path";
import { loadAllDocs } from "@/lib/docs/docs-loader";

export default async function DocsIndexPage() {
  const docsRoot = join(process.cwd(), "docs");
  const docs = await loadAllDocs(docsRoot);

  const categories = Array.from(new Set(docs.map((d) => d.category)));

  return (
    <div className="section-stack">
      <section className="panel panel-strong" style={{ padding: "1.4rem" }}>
        <p className="tiny">Docs</p>
        <h1 className="page-title">Briter Documentation</h1>
        <p className="page-subtitle">
          Everything you need to install, configure, and use Briter.
        </p>
      </section>

      {categories.map((category) => (
        <section key={category} className="panel dashboard-list">
          {category && (
            <p className="tiny" style={{ padding: "0.8rem 1rem 0.4rem" }}>
              {category}
            </p>
          )}
          {docs
            .filter((d) => d.category === category)
            .map((doc) => (
              <article key={doc.slug} className="post-row">
                <div className="section-stack" style={{ gap: "0.3rem" }}>
                  <a className="post-title" href={`/docs/${doc.slug}`}>
                    {doc.title}
                  </a>
                  {doc.description && (
                    <span className="post-meta">{doc.description}</span>
                  )}
                </div>
              </article>
            ))}
        </section>
      ))}
    </div>
  );
}
