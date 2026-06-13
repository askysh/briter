import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  createGitSyncJob,
  type EnqueueGitSyncJobInput,
  type GitSyncJob,
} from "@/lib/queue/job";

/**
 * Jobs written by older Briter versions may lack scheduledFor; fall back to
 * createdAt so legacy queue files sort and run instead of crashing the queue.
 */
function scheduleKeyFor(job: GitSyncJob): string {
  return job.scheduledFor ?? job.createdAt ?? "1970-01-01T00:00:00.000Z";
}

/**
 * A job is terminal once dead-lettered. Terminal jobs are not retried, are not
 * due, and do not block a fresh pending job for the same slug.
 */
function isTerminal(job: GitSyncJob): boolean {
  return job.status === "failed";
}

export class DiskJobQueue {
  constructor(private readonly root: string) {}

  async enqueue(input: EnqueueGitSyncJobInput) {
    const job = createGitSyncJob(input);

    // Per-slug dedup: a post has at most one pending job. Editing a scheduled
    // post must not leave a stale pending job behind that still fires.
    const superseded = (await this.listAll()).filter(
      (existing) =>
        existing.postSlug === job.postSlug && !isTerminal(existing),
    );
    for (const stale of superseded) {
      await this.remove(stale.id);
    }

    await this.write(job);
    return job;
  }

  async listAll() {
    await mkdir(this.root, { recursive: true });
    const fileNames = await readdir(this.root);
    const jobs = await Promise.all(
      fileNames
        .filter((fileName) => fileName.endsWith(".json"))
        .map(async (fileName) => {
          try {
            return JSON.parse(
              await readFile(join(this.root, fileName), "utf8"),
            ) as GitSyncJob;
          } catch {
            // Skip unreadable or malformed job files instead of failing the queue.
            return null;
          }
        }),
    );

    return jobs
      .filter((job): job is GitSyncJob => job !== null)
      .sort((left, right) =>
        scheduleKeyFor(left).localeCompare(scheduleKeyFor(right)),
      );
  }

  async listDue(now = new Date()) {
    const jobs = await this.listAll();

    return jobs.filter(
      (job) =>
        !isTerminal(job) &&
        new Date(scheduleKeyFor(job)).getTime() <= now.getTime(),
    );
  }

  /**
   * Record a failed attempt. Once attempts reach `maxAttempts` the job is
   * dead-lettered (status "failed") and stops being retried, instead of
   * rescheduling forever. Returns the updated job so callers can log outcome.
   */
  async markFailed(
    id: string,
    error: string,
    nextRun: Date,
    maxAttempts = Number.POSITIVE_INFINITY,
  ): Promise<GitSyncJob> {
    const job = await this.read(id);
    const attempts = job.attempts + 1;
    const deadLettered = attempts >= maxAttempts;
    const updated: GitSyncJob = {
      ...job,
      attempts,
      status: deadLettered ? "failed" : job.status,
      lastError: error,
      scheduledFor: nextRun.toISOString(),
      nextRunAt: nextRun.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.write(updated);
    return updated;
  }

  async remove(id: string) {
    await rm(this.filePathFor(id), { force: true });
  }

  async getSummary() {
    const jobs = await this.listAll();
    const deadLettered = jobs.filter(isTerminal);

    return {
      pending: jobs.length - deadLettered.length,
      failed: deadLettered.length,
    };
  }

  private async read(id: string) {
    return JSON.parse(await readFile(this.filePathFor(id), "utf8")) as GitSyncJob;
  }

  private async write(job: GitSyncJob) {
    await mkdir(this.root, { recursive: true });
    await writeFile(this.filePathFor(job.id), JSON.stringify(job, null, 2), "utf8");
  }

  private filePathFor(id: string) {
    return join(this.root, `${id}.json`);
  }
}
