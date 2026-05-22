import type { BriterEnv } from "@/lib/config/env";
import type { DiskJobQueue } from "@/lib/queue/disk-job-queue";
import type { GitClient } from "@/lib/worker/git-client";

export class GitSyncWorker {
  constructor(
    private readonly env: BriterEnv,
    private readonly queue: DiskJobQueue,
    private readonly git: GitClient,
  ) {}

  async processDueJobs(now = new Date()) {
    const jobs = await this.queue.listDue(now);

    for (const job of jobs) {
      try {
        await this.git.assertBranch(this.env.gitBranch);
        await this.git.stage(job.paths);

        if (!(await this.git.hasStagedChanges())) {
          await this.queue.remove(job.id);
          continue;
        }

        await this.git.commit(job.commitMessage);
        await this.git.push(this.env.gitRemote, this.env.gitBranch);
        await this.queue.remove(job.id);
      } catch (error) {
        const delayMs = Math.min(30_000 * 2 ** job.attempts, 30 * 60_000);
        const nextRun = new Date(now.getTime() + delayMs);
        const message =
          error instanceof Error ? error.message : "Unknown git worker failure";

        await this.queue.markFailed(job.id, message, nextRun);
      }
    }

    return jobs.length;
  }
}
