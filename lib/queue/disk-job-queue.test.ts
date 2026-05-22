import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { DiskJobQueue } from "@/lib/queue/disk-job-queue";

let tempRoot = "";

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  }
});

describe("DiskJobQueue", () => {
  test("persists jobs and returns them ordered by scheduled time", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-queue-"));
    const queue = new DiskJobQueue(tempRoot);

    const second = await queue.enqueue({
      kind: "git-sync",
      postSlug: "later-post",
      paths: ["content/posts/later-post.mdx"],
      commitMessage: "later",
      scheduledFor: "2026-04-19T10:00:00.000Z",
    });

    const first = await queue.enqueue({
      kind: "git-sync",
      postSlug: "earlier-post",
      paths: ["content/posts/earlier-post.mdx"],
      commitMessage: "earlier",
      scheduledFor: "2026-04-19T09:00:00.000Z",
    });

    const jobs = await queue.listAll();

    expect(jobs.map((job) => job.id)).toEqual([first.id, second.id]);
  });

  test("bumps attempts and pushes the job into the future when marked failed", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-queue-"));
    const queue = new DiskJobQueue(tempRoot);

    const job = await queue.enqueue({
      kind: "git-sync",
      postSlug: "hello-briter",
      paths: ["content/posts/hello-briter.mdx"],
      commitMessage: "save",
    });

    await queue.markFailed(job.id, "push failed", new Date("2026-04-19T12:00:00.000Z"));

    const [updated] = await queue.listAll();

    expect(updated.attempts).toBe(1);
    expect(updated.lastError).toBe("push failed");
    expect(updated.scheduledFor).toBe("2026-04-19T12:00:00.000Z");
  });

  test("lists only due jobs", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-queue-"));
    const queue = new DiskJobQueue(tempRoot);

    await queue.enqueue({
      kind: "git-sync",
      postSlug: "due-post",
      paths: ["content/posts/due-post.mdx"],
      commitMessage: "due",
      scheduledFor: "2026-04-19T10:00:00.000Z",
    });

    await queue.enqueue({
      kind: "git-sync",
      postSlug: "future-post",
      paths: ["content/posts/future-post.mdx"],
      commitMessage: "future",
      scheduledFor: "2026-04-19T12:00:00.000Z",
    });

    const jobs = await queue.listDue(new Date("2026-04-19T11:00:00.000Z"));

    expect(jobs.map((job) => job.postSlug)).toEqual(["due-post"]);
  });
});
