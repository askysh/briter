import { resolveBriterEnv } from "@/lib/config/env";
import { DiskJobQueue } from "@/lib/queue/disk-job-queue";
import { GitSyncWorker } from "@/lib/worker/git-sync-worker";
import { NoopGitClient, ShellGitClient } from "@/lib/worker/git-client";

const env = resolveBriterEnv();
const queue = new DiskJobQueue(env.queueRoot);
const git = env.workerDryRun
  ? new NoopGitClient()
  : new ShellGitClient(
      env.gitWorktreeRoot,
      env.gitAuthorName,
      env.gitAuthorEmail,
    );

const worker = new GitSyncWorker(env, queue, git);

async function tick() {
  const processed = await worker.processDueJobs();
  console.log(`[briter-worker] processed ${processed} due job(s)`);
}

await tick();

if (process.env.BRITER_WORKER_RUN_ONCE === "1") {
  process.exit(0);
}

setInterval(() => {
  void tick();
}, env.workerPollIntervalMs);
