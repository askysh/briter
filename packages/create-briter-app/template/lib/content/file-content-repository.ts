import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import matter from "gray-matter";

import {
  countWords,
  derivePostStatus,
  estimateReadingTimeMinutes,
  normalizePostInput,
  serializePostFile,
} from "@/lib/content/post-document";
import type { PostDocument, PostFrontmatter, PostInput } from "@/lib/content/types";

const SUPPORTED_EXTENSIONS = new Set([".md", ".mdx"]);

function normalizeDateValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return undefined;
}

export class FileContentRepository {
  constructor(
    private readonly root: string,
    private readonly defaultExtension = ".mdx",
  ) {}

  async listPosts() {
    await mkdir(this.root, { recursive: true });
    const fileNames = await readdir(this.root);
    const posts = await Promise.all(
      fileNames
        .filter((fileName) => SUPPORTED_EXTENSIONS.has(extname(fileName)))
        .map((fileName) => this.readPostFromFile(join(this.root, fileName))),
    );

    return posts.sort((left, right) => {
      const leftDate = left.frontmatter.publishedAt ?? "";
      const rightDate = right.frontmatter.publishedAt ?? "";

      return rightDate.localeCompare(leftDate) || left.slug.localeCompare(right.slug);
    });
  }

  async getPost(slug: string) {
    const candidates = [
      join(this.root, `${slug}.mdx`),
      join(this.root, `${slug}.md`),
    ];

    for (const filePath of candidates) {
      try {
        return await this.readPostFromFile(filePath);
      } catch {
        continue;
      }
    }

    return null;
  }

  async savePost(input: PostInput) {
    const normalized = normalizePostInput(input);
    const filePath = join(this.root, `${normalized.slug}${this.defaultExtension}`);

    // Preserve frontmatter keys Briter doesn't manage (e.g. a site's
    // updatedAt or custom fields) instead of dropping them on rewrite.
    let extraFrontmatter: Record<string, unknown> = {};
    try {
      const existing = matter(await readFile(filePath, "utf8"));
      extraFrontmatter = existing.data;
    } catch {
      // New post: nothing to preserve.
    }

    await mkdir(this.root, { recursive: true });
    await writeFile(
      filePath,
      serializePostFile(
        {
          ...extraFrontmatter,
          title: normalized.title,
          summary: normalized.summary,
          draft: normalized.draft,
          publishedAt: normalized.publishedAt,
          tags: normalized.tags,
        },
        normalized.body,
      ),
      "utf8",
    );

    const post = await this.readPostFromFile(filePath);

    return {
      post,
      absolutePath: filePath,
    };
  }

  private async readPostFromFile(filePath: string): Promise<PostDocument> {
    const raw = await readFile(filePath, "utf8");
    const parsed = matter(raw);
    const frontmatter = parsed.data as Partial<PostFrontmatter>;
    const body = parsed.content;

    const normalizedFrontmatter: PostFrontmatter = {
      title: String(frontmatter.title ?? basename(filePath, extname(filePath))),
      summary: String(frontmatter.summary ?? ""),
      draft: Boolean(frontmatter.draft),
      // YAML parses unquoted dates (publishedAt: 2026-04-18) as Date objects.
      publishedAt: normalizeDateValue(frontmatter.publishedAt),
      tags: Array.isArray(frontmatter.tags)
        ? frontmatter.tags.map((tag) => String(tag))
        : [],
    };

    return {
      slug: basename(filePath, extname(filePath)),
      filePath,
      body,
      frontmatter: normalizedFrontmatter,
      status: derivePostStatus(normalizedFrontmatter),
      readingTimeMinutes: estimateReadingTimeMinutes(body),
      wordCount: countWords(body),
    };
  }
}
