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
