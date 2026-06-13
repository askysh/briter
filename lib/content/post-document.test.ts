import { describe, expect, test } from "bun:test";

import {
  derivePostStatus,
  normalizePostInput,
  serializePostFile,
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

  test("derives archived status regardless of publish date (overrides published)", () => {
    expect(
      derivePostStatus(
        {
          title: "Hidden",
          summary: "Pulled from the site",
          draft: false,
          publishedAt: "2026-04-18T10:00:00.000Z",
          tags: [],
          archived: true,
        },
        new Date("2026-04-19T00:00:00.000Z"),
      ),
    ).toBe("archived");
  });

  test("un-archiving (clearing the flag) restores the prior status", () => {
    const frontmatter = {
      title: "Restored",
      summary: "Back on the site",
      draft: false,
      publishedAt: "2026-04-18T10:00:00.000Z",
      tags: [],
    };
    // archived flag absent -> falls through to the normal classification.
    expect(
      derivePostStatus(frontmatter, new Date("2026-04-19T00:00:00.000Z")),
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

  test("serializes posts with undefined frontmatter values (e.g. no publish date)", () => {
    const file = serializePostFile(
      {
        title: "Dev Test",
        summary: "Dev test",
        draft: true,
        tags: ["dev"],
        publishedAt: undefined,
      },
      "Akash test",
    );

    expect(file).toContain("title: Dev Test");
    expect(file).not.toContain("publishedAt");
    expect(file.endsWith("Akash test\n")).toBe(true);
  });

  test("serializes tags into a comma-safe array", () => {
    expect(serializeTags(["writing", "builder-log"])).toEqual([
      "writing",
      "builder-log",
    ]);
  });
});
