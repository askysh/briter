import matter from "gray-matter";

import type { PostFrontmatter, PostInput, PostStatus } from "@/lib/content/types";

export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function serializeTags(tags: string[]) {
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function ensureTrailingNewline(value: string) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

export function normalizePostInput(input: PostInput): PostInput {
  return {
    ...input,
    slug: slugify(input.slug || input.title),
    title: input.title.trim(),
    summary: input.summary.trim(),
    body: ensureTrailingNewline(input.body.trimEnd()),
    tags: serializeTags(input.tags),
  };
}

export function countWords(body: string) {
  const words = body.trim().match(/\b[\w-]+\b/g);
  return words?.length ?? 0;
}

export function estimateReadingTimeMinutes(body: string) {
  return Math.max(1, Math.ceil(countWords(body) / 200));
}

export function derivePostStatus(
  frontmatter: PostFrontmatter,
  now = new Date(),
): PostStatus {
  // Archived wins over every other state: the file stays on disk but the post
  // is hidden from the public site. Clearing the flag (un-archiving) falls
  // through to the normal draft -> scheduled -> published classification, so
  // the restore is fully reversible.
  if (frontmatter.archived) {
    return "archived";
  }

  if (frontmatter.draft) {
    return "draft";
  }

  if (frontmatter.publishedAt) {
    const publishedAt = new Date(frontmatter.publishedAt);

    if (publishedAt.getTime() > now.getTime()) {
      return "scheduled";
    }
  }

  return "published";
}

export function serializePostFile(frontmatter: PostFrontmatter, body: string) {
  // js-yaml refuses to dump `undefined` values (e.g. an unset publishedAt),
  // so drop them before serializing.
  const definedFrontmatter = Object.fromEntries(
    Object.entries(frontmatter).filter(([, value]) => value !== undefined),
  );
  return matter.stringify(
    ensureTrailingNewline(body.trimEnd()),
    definedFrontmatter,
  );
}
