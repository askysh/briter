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

export class DiskJobQueue {
  constructor(private readonly root: string) {}

  async enqueue(input: EnqueueGitSyncJobInput) {
    const job = createGitSyncJob(input);
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
      (job) => new Date(scheduleKeyFor(job)).getTime() <= now.getTime(),
    );
  }

  async markFailed(id: string, error: string, nextRun: Date) {
    const job = await this.read(id);
    const updated: GitSyncJob = {
      ...job,
      attempts: job.attempts + 1,
      lastError: error,
      scheduledFor: nextRun.toISOString(),
      nextRunAt: nextRun.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.write(updated);
  }

  async remove(id: string) {
    await rm(this.filePathFor(id), { force: true });
  }

  async getSummary() {
    const jobs = await this.listAll();

    return {
      pending: jobs.length,
      failed: jobs.filter((job) => job.attempts > 0).length,
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
