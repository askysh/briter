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

  test("preserves a full datetime publishedAt to the minute (IST offset)", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-content-"));
    // Unquoted full datetime with a +05:30 offset: YAML parses it to a Date.
    // 14:30 IST is 09:00 UTC — it must not collapse to a bare date / midnight.
    await writeFile(
      join(tempRoot, "scheduled-note.mdx"),
      `---\ntitle: Scheduled\npublishedAt: 2026-07-01T14:30:00+05:30\nsummary: S\n---\n\nBody.\n`,
      "utf8",
    );
    const repository = new FileContentRepository(tempRoot);

    const post = await repository.getPost("scheduled-note");

    expect(post?.frontmatter.publishedAt).toBe("2026-07-01T09:00:00.000Z");
    // Same UTC instant as 14:30 IST, proving the time-of-day survived.
    expect(new Date(post!.frontmatter.publishedAt!).getTime()).toBe(
      new Date("2026-07-01T14:30:00+05:30").getTime(),
    );
  });

  test("round-trips a datetime: save -> file -> reload yields the identical value", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-content-"));
    const repository = new FileContentRepository(tempRoot);
    // The editor writes a full UTC ISO instant (datetime-local -> toISOString).
    const value = "2026-07-01T09:00:00.000Z";

    const { post: saved } = await repository.savePost({
      slug: "round-trip",
      title: "Round Trip",
      summary: "S",
      body: "Body.",
      tags: [],
      draft: false,
      publishedAt: value,
    });
    expect(saved.frontmatter.publishedAt).toBe(value);

    const reloaded = await repository.getPost("round-trip");
    expect(reloaded?.frontmatter.publishedAt).toBe(value);
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
