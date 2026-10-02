import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { gitTargetSiteAdapter } from "@/lib/adapters/git-target-site-adapter";
import type { FileContentRepository } from "@/lib/content/file-content-repository";
import type { PostDocument, PostInput } from "@/lib/content/types";
import { PublishService } from "@/lib/publish/publish-service";
import { DiskJobQueue } from "@/lib/queue/disk-job-queue";
import { validatePaths } from "@/lib/worker/path-validator";

// Mirrors the akashmishra.com VPS layout: Briter writes into an external site
// repo mounted at a different path than its own process.cwd().
const WORKTREE = "/opt/site-repo";
const NOTE_PATH = `${WORKTREE}/content/notes/the-spark-plug-burns-almost-nothing.mdx`;

const INPUT: PostInput = {
  slug: "the-spark-plug-burns-almost-nothing",
  title: "The Spark-plug burns almost nothing",
  summary: "S",
  body: "Body.",
  tags: [],
  draft: false,
};

function buildPost(overrides: Partial<PostDocument> = {}): PostDocument {
  return {
    slug: "the-spark-plug-burns-almost-nothing",
    filePath: NOTE_PATH,
    body: "Body.",
    frontmatter: {
      title: "The Spark-plug burns almost nothing",
      summary: "S",
      draft: false,
      publishedAt: "2026-06-13T13:30:00.000Z",
      tags: [],
    },
    status: "published",
    readingTimeMinutes: 1,
    wordCount: 1,
    ...overrides,
  };
}

function fakeRepository(post: PostDocument): FileContentRepository {
  return {
    savePost: async () => ({ post, absolutePath: post.filePath }),
  } as unknown as FileContentRepository;
}

let queueRoot = "";

afterEach(async () => {
  if (queueRoot) {
    await rm(queueRoot, { recursive: true, force: true });
    queueRoot = "";
  }
});

async function makeQueue() {
  queueRoot = await mkdtemp(join(tmpdir(), "briter-queue-"));
  return new DiskJobQueue(queueRoot);
}

describe("PublishService", () => {
  test("enqueues a worktree-relative path the git-target allowlist accepts", async () => {
    const queue = await makeQueue();
    const service = new PublishService(
      fakeRepository(buildPost()),
      queue,
      gitTargetSiteAdapter,
      WORKTREE,
    );

    const { job } = await service.save(INPUT, "publish");

    // Regression: a cwd-relative path here was "../opt/site-repo/content/..."
    // which the worker dropped as "No allowed paths in job."
    expect(job.paths).toEqual([
      "content/notes/the-spark-plug-burns-almost-nothing.mdx",
    ]);
    expect(validatePaths(job.paths, gitTargetSiteAdapter)).toEqual(job.paths);
  });

  test("defers a scheduled post's sync until its publish instant", async () => {
    const queue = await makeQueue();
    const publishedAt = "2026-06-13T13:30:00.000Z";
    const post = buildPost({
      status: "scheduled",
      frontmatter: { ...buildPost().frontmatter, publishedAt },
    });
    const service = new PublishService(
      fakeRepository(post),
      queue,
      gitTargetSiteAdapter,
      WORKTREE,
    );

    const { job } = await service.save(INPUT, "schedule");

    expect(job.scheduledFor).toBe(publishedAt);
  });

  test("syncs an immediate publish without deferring to a future instant", async () => {
    const queue = await makeQueue();
    const service = new PublishService(
      fakeRepository(buildPost({ status: "published" })),
      queue,
      gitTargetSiteAdapter,
      WORKTREE,
    );
    const before = Date.now();

    const { job } = await service.save(INPUT, "publish");

    const scheduledMs = new Date(job.scheduledFor).getTime();
    expect(scheduledMs).toBeGreaterThanOrEqual(before - 1000);
    expect(scheduledMs).toBeLessThanOrEqual(Date.now() + 1000);
  });
});

describe("PublishService upload assets", () => {
  test("stages the uploads a post references alongside the post", async () => {
    const queue = await makeQueue();
    const assets = [
      "public/uploads/notes/abc-400.webp",
      "public/uploads/notes/abc.json",
    ];
    const service = new PublishService(
      fakeRepository(buildPost()),
      queue,
      gitTargetSiteAdapter,
      WORKTREE,
      { referencedAssetPaths: async () => assets },
    );

    const { job } = await service.save(INPUT, "publish");

    expect(job.paths).toEqual([
      "content/notes/the-spark-plug-burns-almost-nothing.mdx",
      ...assets,
    ]);
    expect(validatePaths(job.paths, gitTargetSiteAdapter)).toEqual(job.paths);
  });
});
