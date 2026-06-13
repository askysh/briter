import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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

  test("tolerates legacy job files without scheduledFor and malformed files", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-queue-"));
    const queue = new DiskJobQueue(tempRoot);

    await writeFile(
      join(tempRoot, "legacy.json"),
      JSON.stringify({
        id: "legacy",
        kind: "git-sync",
        paths: ["content/posts/test.mdx"],
        status: "queued",
        attempts: 0,
        createdAt: "2026-05-27T12:18:11.176802Z",
      }),
      "utf8",
    );
    await writeFile(join(tempRoot, "broken.json"), "not json", "utf8");

    const recent = await queue.enqueue({
      kind: "git-sync",
      postSlug: "recent-post",
      paths: ["content/posts/recent-post.mdx"],
      commitMessage: "recent",
      scheduledFor: "2026-06-01T00:00:00.000Z",
    });

    const jobs = await queue.listAll();
    expect(jobs.map((job) => job.id)).toEqual(["legacy", recent.id]);

    const due = await queue.listDue(new Date("2026-06-02T00:00:00.000Z"));
    expect(due.map((job) => job.id)).toEqual(["legacy", recent.id]);
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

  test("supersedes an existing pending job for the same slug", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-queue-"));
    const queue = new DiskJobQueue(tempRoot);

    const stale = await queue.enqueue({
      kind: "git-sync",
      postSlug: "scheduled-post",
      paths: ["content/posts/scheduled-post.mdx"],
      commitMessage: "first schedule",
      scheduledFor: "2026-04-19T10:00:00.000Z",
    });

    const fresh = await queue.enqueue({
      kind: "git-sync",
      postSlug: "scheduled-post",
      paths: ["content/posts/scheduled-post.mdx"],
      commitMessage: "edited schedule",
      scheduledFor: "2026-04-19T14:00:00.000Z",
    });

    const jobs = await queue.listAll();
    const forSlug = jobs.filter((job) => job.postSlug === "scheduled-post");

    expect(forSlug.map((job) => job.id)).toEqual([fresh.id]);
    expect(forSlug).toHaveLength(1);
    expect(fresh.id).not.toBe(stale.id);
  });

  test("does not supersede jobs for a different slug", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-queue-"));
    const queue = new DiskJobQueue(tempRoot);

    const other = await queue.enqueue({
      kind: "git-sync",
      postSlug: "other-post",
      paths: ["content/posts/other-post.mdx"],
      commitMessage: "other",
    });

    await queue.enqueue({
      kind: "git-sync",
      postSlug: "scheduled-post",
      paths: ["content/posts/scheduled-post.mdx"],
      commitMessage: "scheduled",
    });

    const jobs = await queue.listAll();
    expect(jobs.map((job) => job.postSlug).sort()).toEqual([
      "other-post",
      "scheduled-post",
    ]);
    expect(jobs.some((job) => job.id === other.id)).toBe(true);
  });

  test("dead-letters a job after it reaches max attempts", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-queue-"));
    const queue = new DiskJobQueue(tempRoot);

    const job = await queue.enqueue({
      kind: "git-sync",
      postSlug: "doomed-post",
      paths: ["content/posts/doomed-post.mdx"],
      commitMessage: "save",
    });

    const maxAttempts = 3;
    let last;
    for (let i = 0; i < maxAttempts; i += 1) {
      last = await queue.markFailed(
        job.id,
        `attempt ${i + 1} failed`,
        new Date("2026-04-19T12:00:00.000Z"),
        maxAttempts,
      );
    }

    expect(last?.attempts).toBe(maxAttempts);
    expect(last?.status).toBe("failed");

    // Terminal job is no longer due and so stops retrying.
    const due = await queue.listDue(new Date("2026-04-20T00:00:00.000Z"));
    expect(due.some((j) => j.id === job.id)).toBe(false);

    // GET /api/queue surfaces it via the failed count.
    const summary = await queue.getSummary();
    expect(summary.failed).toBe(1);
    expect(summary.pending).toBe(0);
  });

  test("keeps a job pending and due while under the attempt cap", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-queue-"));
    const queue = new DiskJobQueue(tempRoot);

    const job = await queue.enqueue({
      kind: "git-sync",
      postSlug: "retrying-post",
      paths: ["content/posts/retrying-post.mdx"],
      commitMessage: "save",
    });

    const updated = await queue.markFailed(
      job.id,
      "transient failure",
      new Date("2026-04-19T11:00:00.000Z"),
      8,
    );

    expect(updated.attempts).toBe(1);
    expect(updated.status).toBeUndefined();

    const summary = await queue.getSummary();
    expect(summary.pending).toBe(1);
    expect(summary.failed).toBe(0);
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
