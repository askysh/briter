import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { SiteAdapter } from "@/lib/adapters/site-adapter";
import type { BriterEnv } from "@/lib/config/env";
import { DiskJobQueue } from "@/lib/queue/disk-job-queue";
import type { GitClient } from "@/lib/worker/git-client";
import { GitSyncWorker, type JobLogEntry } from "@/lib/worker/git-sync-worker";

let tempRoot = "";

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  }
});

const adapter = {
  getAllowedPaths: () => [/^content\/posts\//],
} as unknown as SiteAdapter;

function envWith(maxAttempts: number): BriterEnv {
  return {
    gitBranch: "main",
    gitRemote: "origin",
    workerMaxAttempts: maxAttempts,
  } as unknown as BriterEnv;
}

class OkGitClient implements GitClient {
  async assertBranch() {}
  async stage() {}
  async hasStagedChanges() {
    return true;
  }
  async commit() {}
  async push() {}
}

class FailingGitClient implements GitClient {
  async assertBranch() {}
  async stage() {}
  async hasStagedChanges(): Promise<boolean> {
    throw new Error("push exploded");
  }
  async commit() {}
  async push() {}
}

// Records every push so a test can assert a future-scheduled job never reaches
// the remote before its time.
class CountingGitClient implements GitClient {
  public pushes = 0;
  async assertBranch() {}
  async stage() {}
  async hasStagedChanges() {
    return true;
  }
  async commit() {}
  async push() {
    this.pushes += 1;
  }
}

describe("GitSyncWorker structured logging", () => {
  test("emits a start and result log line per processed job", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-worker-"));
    const queue = new DiskJobQueue(tempRoot);
    const logs: JobLogEntry[] = [];

    const job = await queue.enqueue({
      kind: "git-sync",
      postSlug: "hello-world",
      paths: ["content/posts/hello-world.mdx"],
      commitMessage: "save",
      scheduledFor: "2026-01-01T00:00:00.000Z",
    });

    const worker = new GitSyncWorker(
      envWith(8),
      queue,
      new OkGitClient(),
      adapter,
      (entry) => logs.push(entry),
    );

    await worker.processDueJobs(new Date("2026-04-19T12:00:00.000Z"));

    expect(logs).toEqual([
      { jobId: job.id, slug: "hello-world", attempt: 1, outcome: "start" },
      {
        jobId: job.id,
        slug: "hello-world",
        attempt: 1,
        outcome: "published",
      },
    ]);
  });

  test("holds a future-scheduled job in the queue: zero push before its time, one after (D1)", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-worker-"));
    const queue = new DiskJobQueue(tempRoot);
    const git = new CountingGitClient();

    const publishInstant = "2026-07-01T09:00:00.000Z";
    await queue.enqueue({
      kind: "git-sync",
      postSlug: "future-post",
      paths: ["content/posts/future-post.mdx"],
      commitMessage: "schedule",
      scheduledFor: publishInstant,
    });

    const worker = new GitSyncWorker(
      envWith(8),
      queue,
      git,
      adapter,
      () => {},
    );

    // Before the publish instant: the job is not due, so nothing is pushed and
    // the job stays in the queue (it never reaches the remote / git history).
    const beforeProcessed = await worker.processDueJobs(
      new Date("2026-06-30T23:59:00.000Z"),
    );
    expect(beforeProcessed).toBe(0);
    expect(git.pushes).toBe(0);
    expect((await queue.listAll()).length).toBe(1);

    // One minute after the instant: the job is due and pushes exactly once.
    const afterProcessed = await worker.processDueJobs(
      new Date("2026-07-01T09:01:00.000Z"),
    );
    expect(afterProcessed).toBe(1);
    expect(git.pushes).toBe(1);
    // Job is consumed once published.
    expect((await queue.listAll()).length).toBe(0);
  });

  test("logs failure outcome with slug and error on a failed attempt", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-worker-"));
    const queue = new DiskJobQueue(tempRoot);
    const logs: JobLogEntry[] = [];

    await queue.enqueue({
      kind: "git-sync",
      postSlug: "boom",
      paths: ["content/posts/boom.mdx"],
      commitMessage: "save",
      scheduledFor: "2026-01-01T00:00:00.000Z",
    });

    const worker = new GitSyncWorker(
      envWith(8),
      queue,
      new FailingGitClient(),
      adapter,
      (entry) => logs.push(entry),
    );

    await worker.processDueJobs(new Date("2026-04-19T12:00:00.000Z"));

    const result = logs.find((l) => l.outcome !== "start");
    expect(result?.slug).toBe("boom");
    expect(result?.outcome).toBe("failed");
    expect(result?.error).toBe("push exploded");
  });

  test("dead-letters and logs once the attempt cap is reached", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-worker-"));
    const queue = new DiskJobQueue(tempRoot);
    const logs: JobLogEntry[] = [];

    await queue.enqueue({
      kind: "git-sync",
      postSlug: "doomed",
      paths: ["content/posts/doomed.mdx"],
      commitMessage: "save",
      scheduledFor: "2026-01-01T00:00:00.000Z",
    });

    const worker = new GitSyncWorker(
      envWith(2),
      queue,
      new FailingGitClient(),
      adapter,
      (entry) => logs.push(entry),
    );

    // First run: attempt 1 -> failed, still retrying.
    await worker.processDueJobs(new Date("2026-04-19T12:00:00.000Z"));
    // Second run (far future so the retry is due): attempt 2 -> dead-lettered.
    await worker.processDueJobs(new Date("2026-04-20T12:00:00.000Z"));

    const outcomes = logs.filter((l) => l.outcome !== "start").map((l) => l.outcome);
    expect(outcomes).toEqual(["failed", "dead-lettered"]);

    const summary = await queue.getSummary();
    expect(summary.failed).toBe(1);
    expect(summary.pending).toBe(0);
  });
});
