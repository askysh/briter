import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  createGitSyncJob,
  type EnqueueGitSyncJobInput,
  type GitSyncJob,
} from "@/lib/queue/job";

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
        .map(async (fileName) =>
          JSON.parse(await readFile(join(this.root, fileName), "utf8")) as GitSyncJob,
        ),
    );

    return jobs.sort((left, right) =>
      left.scheduledFor.localeCompare(right.scheduledFor),
    );
  }

  async listDue(now = new Date()) {
    const jobs = await this.listAll();

    return jobs.filter(
      (job) => new Date(job.scheduledFor).getTime() <= now.getTime(),
    );
  }

  async markFailed(id: string, error: string, nextRun: Date) {
    const job = await this.read(id);
    const updated: GitSyncJob = {
      ...job,
      attempts: job.attempts + 1,
      lastError: error,
      scheduledFor: nextRun.toISOString(),
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
