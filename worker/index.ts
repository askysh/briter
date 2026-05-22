import { getAdapter } from "@/lib/adapters/adapter-registry";
import { loadRuntimeConfig } from "@/lib/config/runtime-config";
import { DiskJobQueue } from "@/lib/queue/disk-job-queue";
import { GitSyncWorker } from "@/lib/worker/git-sync-worker";
import { NoopGitClient, ShellGitClient } from "@/lib/worker/git-client";

const env = await loadRuntimeConfig();
const queue = new DiskJobQueue(env.queueRoot);
const git = env.workerDryRun
  ? new NoopGitClient()
  : new ShellGitClient(
      env.gitWorktreeRoot,
      env.gitAuthorName,
      env.gitAuthorEmail,
    );

const worker = new GitSyncWorker(env, queue, git, getAdapter(env.siteAdapterKey));

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
