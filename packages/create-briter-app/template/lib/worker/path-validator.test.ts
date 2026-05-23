import { describe, expect, test } from "bun:test";

import { gitTargetSiteAdapter } from "@/lib/adapters/git-target-site-adapter";
import { validatePaths } from "@/lib/worker/path-validator";

describe("validatePaths", () => {
  test("allows adapter-approved relative paths", () => {
    expect(
      validatePaths(
        ["content/posts/hello.mdx", "public/uploads/hero.webp"],
        gitTargetSiteAdapter,
      ),
    ).toEqual(["content/posts/hello.mdx", "public/uploads/hero.webp"]);
  });

  test("rejects traversal and absolute paths before applying adapter allowlists", () => {
    expect(
      validatePaths(
        [
          "content/../scripts/deploy.sh",
          "/content/posts/absolute.mdx",
          "public/uploads/../../storage/secrets.json",
          "content/posts/valid.mdx",
        ],
        gitTargetSiteAdapter,
      ),
    ).toEqual(["content/posts/valid.mdx"]);
  });
});
