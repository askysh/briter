import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";

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

    await mkdir(this.root, { recursive: true });
    await writeFile(
      filePath,
      serializePostFile(
        {
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
      relativePath: relative(process.cwd(), filePath),
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
      publishedAt:
        typeof frontmatter.publishedAt === "string"
          ? frontmatter.publishedAt
          : undefined,
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
