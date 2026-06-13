import type { SiteAdapter } from "@/lib/adapters/site-adapter";
import type { BriterEnv } from "@/lib/config/env";
import type { DiskJobQueue } from "@/lib/queue/disk-job-queue";
import type { GitClient } from "@/lib/worker/git-client";
import { validatePaths } from "@/lib/worker/path-validator";

export type JobOutcome =
  | "published"
  | "nochange"
  | "nopaths"
  | "failed"
  | "dead-lettered";

export type JobLogEntry = {
  jobId: string;
  slug: string;
  attempt: number;
  outcome: JobOutcome | "start";
  error?: string;
};

export type JobLogger = (entry: JobLogEntry) => void;

const defaultLogger: JobLogger = (entry) => {
  console.log(`[briter-worker] ${JSON.stringify(entry)}`);
};

export class GitSyncWorker {
  constructor(
    private readonly env: BriterEnv,
    private readonly queue: DiskJobQueue,
    private readonly git: GitClient,
    private readonly adapter: SiteAdapter,
    private readonly log: JobLogger = defaultLogger,
  ) {}

  async processDueJobs(now = new Date()) {
    const jobs = await this.queue.listDue(now);

    for (const job of jobs) {
      // attempt is 1-based for this run: a job with 0 prior attempts is on
      // attempt 1.
      const attempt = job.attempts + 1;
      const base = { jobId: job.id, slug: job.postSlug, attempt };
      this.log({ ...base, outcome: "start" });

      try {
        const allowedPaths = validatePaths(job.paths, this.adapter);
        if (allowedPaths.length === 0) {
          await this.queue.markFailed(job.id, "No allowed paths in job.", now);
          this.log({ ...base, outcome: "nopaths" });
          continue;
        }

        await this.git.assertBranch(this.env.gitBranch);
        await this.git.stage(allowedPaths);

        if (!(await this.git.hasStagedChanges())) {
          await this.queue.remove(job.id);
          this.log({ ...base, outcome: "nochange" });
          continue;
        }

        await this.git.commit(job.commitMessage);
        await this.git.push(this.env.gitRemote, this.env.gitBranch);
        await this.queue.remove(job.id);
        this.log({ ...base, outcome: "published" });
      } catch (error) {
        const retryDelays = [60_000, 5 * 60_000, 30 * 60_000];
        const delayMs = retryDelays[Math.min(job.attempts, retryDelays.length - 1)];
        const nextRun = new Date(now.getTime() + delayMs);
        const message =
          error instanceof Error ? error.message : "Unknown git worker failure";

        const updated = await this.queue.markFailed(
          job.id,
          message,
          nextRun,
          this.env.workerMaxAttempts,
        );

        this.log({
          ...base,
          outcome: updated.status === "failed" ? "dead-lettered" : "failed",
          error: message,
        });
      }
    }

    return jobs.length;
  }
}
