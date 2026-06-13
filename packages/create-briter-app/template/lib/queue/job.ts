import { randomUUID } from "node:crypto";

export type GitSyncJobStatus = "pending" | "failed";

export type GitSyncJob = {
  id: string;
  kind: "git-sync";
  postSlug: string;
  paths: string[];
  commitMessage: string;
  scheduledFor: string;
  nextRunAt?: string;
  status?: GitSyncJobStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export type EnqueueGitSyncJobInput = {
  kind: "git-sync";
  postSlug: string;
  paths: string[];
  commitMessage: string;
  scheduledFor?: string;
};

export function createGitSyncJob(input: EnqueueGitSyncJobInput): GitSyncJob {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    kind: "git-sync",
    postSlug: input.postSlug,
    paths: input.paths,
    commitMessage: input.commitMessage,
    scheduledFor: input.scheduledFor ?? now,
    nextRunAt: input.scheduledFor ?? now,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
}
