export const dynamic = "force-dynamic";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";

import { createAppServices } from "@/lib/app/services";
import { renderMarkdownPreview } from "@/lib/preview/markdown-preview";

const DOC_FILE_BY_SLUG: Record<string, string> = {
  architecture: "architecture.md",
  "local-development": "local-development.md",
  "product-philosophy": "product-philosophy.md",
  "v1-out-of-scope": "v1-out-of-scope.md",
  "v1-roadmap": "v1-roadmap.md",
};

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const fileName = DOC_FILE_BY_SLUG[slug];

  if (!fileName) {
    notFound();
  }

  const { env } = await createAppServices();
  const markdown = await readFile(join(env.appRoot, "docs", fileName), "utf8");
  const preview = await renderMarkdownPreview(markdown);

  return (
    <article className="article-shell">
      <div className="article-header">
        <p className="tiny">Documentation</p>
        <h1>{fileName.replace(".md", "").replaceAll("-", " ")}</h1>
        <p className="page-subtitle">
          Rendered from <code>{`docs/${fileName}`}</code>
        </p>
      </div>

      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: preview.html }}
      />
    </article>
  );
}
