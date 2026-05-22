import type { SiteAdapter } from "@/lib/adapters/site-adapter";
import type { BriterEnv } from "@/lib/config/env";
import type { DiskJobQueue } from "@/lib/queue/disk-job-queue";
import type { GitClient } from "@/lib/worker/git-client";
import { validatePaths } from "@/lib/worker/path-validator";

export class GitSyncWorker {
  constructor(
    private readonly env: BriterEnv,
    private readonly queue: DiskJobQueue,
    private readonly git: GitClient,
    private readonly adapter: SiteAdapter,
  ) {}

  async processDueJobs(now = new Date()) {
    const jobs = await this.queue.listDue(now);

    for (const job of jobs) {
      try {
        const allowedPaths = validatePaths(job.paths, this.adapter);
        if (allowedPaths.length === 0) {
          await this.queue.markFailed(job.id, "No allowed paths in job.", now);
          continue;
        }

        await this.git.assertBranch(this.env.gitBranch);
        await this.git.stage(allowedPaths);

        if (!(await this.git.hasStagedChanges())) {
          await this.queue.remove(job.id);
          continue;
        }

        await this.git.commit(job.commitMessage);
        await this.git.push(this.env.gitRemote, this.env.gitBranch);
        await this.queue.remove(job.id);
      } catch (error) {
        const retryDelays = [60_000, 5 * 60_000, 30 * 60_000];
        const delayMs = retryDelays[Math.min(job.attempts, retryDelays.length - 1)];
        const nextRun = new Date(now.getTime() + delayMs);
        const message =
          error instanceof Error ? error.message : "Unknown git worker failure";

        await this.queue.markFailed(job.id, message, nextRun);
      }
    }

    return jobs.length;
  }
}
