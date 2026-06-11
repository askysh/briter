import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { FileContentRepository } from "@/lib/content/file-content-repository";

let tempRoot = "";

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  }
});

// Mirrors a real akashmishra.com note: unquoted YAML dates and extra keys.
const SITE_NOTE = `---
title: "Existing Note"
publishedAt: 2026-04-18
updatedAt: 2026-04-19
summary: A note that predates Briter.
tags:
  - writing
draft: false
---

Original body.
`;

describe("FileContentRepository", () => {
  test("reads YAML date values as strings", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-content-"));
    await writeFile(join(tempRoot, "existing-note.mdx"), SITE_NOTE, "utf8");
    const repository = new FileContentRepository(tempRoot);

    const post = await repository.getPost("existing-note");

    expect(post?.frontmatter.publishedAt).toBe("2026-04-18");
    expect(post?.status).toBe("published");

    // listPosts sorts by publishedAt with localeCompare — must not throw.
    const posts = await repository.listPosts();
    expect(posts).toHaveLength(1);
  });

  test("preserves frontmatter keys it does not manage when saving", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-content-"));
    await writeFile(join(tempRoot, "existing-note.mdx"), SITE_NOTE, "utf8");
    const repository = new FileContentRepository(tempRoot);

    await repository.savePost({
      slug: "existing-note",
      title: "Existing Note",
      summary: "A note that predates Briter.",
      body: "Edited body.",
      tags: ["writing"],
      draft: false,
      publishedAt: "2026-04-18",
    });

    const raw = await readFile(join(tempRoot, "existing-note.mdx"), "utf8");
    expect(raw).toContain("updatedAt:");
    expect(raw).toContain("publishedAt:");
    expect(raw).toContain("Edited body.");
  });
});
