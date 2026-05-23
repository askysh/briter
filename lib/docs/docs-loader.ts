import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { renderMarkdownPreview } from "@/lib/preview/markdown-preview";

export type DocMeta = {
  slug: string;
  title: string;
  description: string;
  order: number;
  category: string;
};

export type DocPage = DocMeta & {
  html: string;
};

function parseFrontmatter(raw: string): {
  meta: Record<string, string | number>;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta: Record<string, string | number> = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
    meta[key] = /^\d+$/.test(value) ? Number(value) : value;
  }

  return { meta, body: match[2] };
}

export async function loadAllDocs(docsRoot: string): Promise<DocMeta[]> {
  let entries: string[];
  try {
    entries = await readdir(docsRoot);
  } catch {
    return [];
  }

  const metas: DocMeta[] = [];

  for (const entry of entries.filter((f) => f.endsWith(".mdx"))) {
    const raw = await readFile(join(docsRoot, entry), "utf8");
    const { meta } = parseFrontmatter(raw);
    const slug = entry.replace(/\.mdx$/, "");
    metas.push({
      slug,
      title: String(meta.title ?? slug),
      description: String(meta.description ?? ""),
      order: Number(meta.order ?? 99),
      category: String(meta.category ?? ""),
    });
  }

  return metas.sort((a, b) => a.order - b.order);
}

export async function loadDoc(
  docsRoot: string,
  slug: string,
): Promise<DocPage | null> {
  const filePath = join(docsRoot, `${slug}.mdx`);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return null;
  }

  const { meta, body } = parseFrontmatter(raw);
  const { html } = await renderMarkdownPreview(body);

  return {
    slug,
    title: String(meta.title ?? slug),
    description: String(meta.description ?? ""),
    order: Number(meta.order ?? 99),
    category: String(meta.category ?? ""),
    html,
  };
}
