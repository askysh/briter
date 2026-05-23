import { describe, expect, test } from "bun:test";

import { gitTargetSiteAdapter } from "@/lib/adapters/git-target-site-adapter";
import type { PostDocument } from "@/lib/content/types";

// Minimal stub for PostDocument used by buildCommitMessage
function makePost(title: string): PostDocument {
  return {
    slug: "test-slug",
    status: "draft",
    frontmatter: {
      title,
      summary: "Summary",
      draft: true,
      tags: [],
      publishedAt: undefined,
    },
    body: "",
    filePath: "/content/posts/test-slug.mdx",
    readingTimeMinutes: 1,
    wordCount: 0,
  };
}

describe("gitTargetSiteAdapter", () => {
  test("has the expected key and label", () => {
    expect(gitTargetSiteAdapter.key).toBe("git-target");
    expect(typeof gitTargetSiteAdapter.label).toBe("string");
  });

  test("contentExtension is .mdx", () => {
    expect(gitTargetSiteAdapter.contentExtension).toBe(".mdx");
  });

  test("publicReader is 'external'", () => {
    expect(gitTargetSiteAdapter.publicReader).toBe("external");
  });

  describe("URL helpers", () => {
    test("getEditorHref returns /write/<slug>", () => {
      expect(gitTargetSiteAdapter.getEditorHref("my-post")).toBe("/write/my-post");
    });

    test("getPreviewHref returns /preview/<slug>", () => {
      expect(gitTargetSiteAdapter.getPreviewHref("my-post")).toBe("/preview/my-post");
    });

    test("getPublishedHref returns /posts/<slug>", () => {
      expect(gitTargetSiteAdapter.getPublishedHref("my-post")).toBe("/posts/my-post");
    });
  });

  describe("getRevalidatePaths", () => {
    test("returns an empty array (no self-hosted reader)", () => {
      expect(gitTargetSiteAdapter.getRevalidatePaths("any-slug")).toEqual([]);
    });
  });

  describe("getAllowedPaths", () => {
    test("returns RegExp patterns for content and uploads", () => {
      const patterns = gitTargetSiteAdapter.getAllowedPaths();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
      // content paths must be allowed
      expect(patterns.some((re) => re.test("content/posts/my-post.mdx"))).toBe(true);
      // uploads must be allowed
      expect(patterns.some((re) => re.test("public/uploads/image.webp"))).toBe(true);
    });

    test("does not allow arbitrary paths like scripts/ or storage/", () => {
      const patterns = gitTargetSiteAdapter.getAllowedPaths();
      const allowed = (p: string) => patterns.some((re) => re.test(p));
      expect(allowed("scripts/deploy.sh")).toBe(false);
      expect(allowed("storage/secrets.json")).toBe(false);
    });
  });

  describe("buildCommitMessage", () => {
    test("save-draft produces expected message", () => {
      const msg = gitTargetSiteAdapter.buildCommitMessage("save-draft", makePost("My Draft"));
      expect(msg).toBe('briter: save draft "My Draft"');
    });

    test("publish produces expected message", () => {
      const msg = gitTargetSiteAdapter.buildCommitMessage("publish", makePost("Launch Post"));
      expect(msg).toBe('briter: publish post "Launch Post"');
    });

    test("schedule produces expected message", () => {
      const msg = gitTargetSiteAdapter.buildCommitMessage("schedule", makePost("Future Post"));
      expect(msg).toBe('briter: schedule post "Future Post"');
    });

    test("title with special characters is preserved verbatim in commit message", () => {
      const msg = gitTargetSiteAdapter.buildCommitMessage("publish", makePost("Rock & Roll"));
      expect(msg).toContain("Rock & Roll");
    });
  });
});
