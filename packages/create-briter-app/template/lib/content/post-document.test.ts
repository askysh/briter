import { describe, expect, test } from "bun:test";

import {
  derivePostStatus,
  normalizePostInput,
  serializeTags,
} from "@/lib/content/post-document";

describe("post-document", () => {
  test("derives draft status from frontmatter", () => {
    expect(
      derivePostStatus(
        {
          title: "Draft",
          summary: "Still cooking",
          draft: true,
          publishedAt: "2026-04-25T10:00:00.000Z",
          tags: [],
        },
        new Date("2026-04-19T00:00:00.000Z"),
      ),
    ).toBe("draft");
  });

  test("derives scheduled status when publish date is in the future", () => {
    expect(
      derivePostStatus(
        {
          title: "Scheduled",
          summary: "Coming soon",
          draft: false,
          publishedAt: "2026-04-25T10:00:00.000Z",
          tags: [],
        },
        new Date("2026-04-19T00:00:00.000Z"),
      ),
    ).toBe("scheduled");
  });

  test("derives published status when publish date is now or earlier", () => {
    expect(
      derivePostStatus(
        {
          title: "Live",
          summary: "Already out",
          draft: false,
          publishedAt: "2026-04-18T10:00:00.000Z",
          tags: [],
        },
        new Date("2026-04-19T00:00:00.000Z"),
      ),
    ).toBe("published");
  });

  test("normalizes slug, tags, and body for persistence", () => {
    expect(
      normalizePostInput({
        slug: "  Hello World  ",
        title: "Hello",
        summary: "Summary",
        body: "Body",
        tags: [" writing ", "", "notes"],
        draft: true,
      }),
    ).toMatchObject({
      slug: "hello-world",
      tags: ["writing", "notes"],
      body: "Body\n",
    });
  });

  test("serializes tags into a comma-safe array", () => {
    expect(serializeTags(["writing", "builder-log"])).toEqual([
      "writing",
      "builder-log",
    ]);
  });
});
