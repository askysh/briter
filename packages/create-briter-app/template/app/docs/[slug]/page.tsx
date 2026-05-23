export const dynamic = "force-dynamic";

import { join } from "node:path";
import { notFound } from "next/navigation";

import { loadDoc, loadAllDocs } from "@/lib/docs/docs-loader";

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const docsRoot = join(process.cwd(), "docs");

  const [doc, allDocs] = await Promise.all([
    loadDoc(docsRoot, slug),
    loadAllDocs(docsRoot),
  ]);

  if (!doc) {
    notFound();
  }

  // Content is rendered server-side from our own .mdx source files — safe to use innerHTML
  const safeHtml = doc.html;

  return (
    <div className="section-stack">
      <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
        <nav
          className="panel"
          style={{ minWidth: "180px", padding: "1rem", flexShrink: 0 }}
        >
          <p className="tiny" style={{ marginBottom: "0.75rem" }}>
            Docs
          </p>
          {allDocs.map((d) => (
            <div key={d.slug} style={{ marginBottom: "0.4rem" }}>
              <a
                href={`/docs/${d.slug}`}
                className={d.slug === slug ? "post-title" : "post-meta"}
                style={{ display: "block" }}
              >
                {d.title}
              </a>
            </div>
          ))}
        </nav>

        <article className="article-shell" style={{ flex: 1, minWidth: 0 }}>
          <div className="article-header">
            <p className="tiny">Documentation</p>
            <h1>{doc.title}</h1>
            {doc.description && (
              <p className="page-subtitle">{doc.description}</p>
            )}
          </div>

          <div
            className="prose"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        </article>
      </div>
    </div>
  );
}
