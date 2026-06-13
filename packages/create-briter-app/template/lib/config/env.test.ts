import { describe, expect, test } from "bun:test";

import { resolveBriterEnv } from "@/lib/config/env";

describe("resolveBriterEnv", () => {
  test("uses sensible defaults for a local single-user install", () => {
    const env = resolveBriterEnv({
      BRITER_APP_ROOT: "/workspace/briter",
    });

    expect(env.contentRoot).toBe("/workspace/briter/content/posts");
    expect(env.uploadRoot).toBe("/workspace/briter/storage/uploads/posts");
    expect(env.queueRoot).toBe("/workspace/briter/storage/queue");
    expect(env.gitBranch).toBe("main");
    expect(env.workerDryRun).toBe(true);
    expect(env.workerMaxAttempts).toBe(8);
  });

  test("respects an explicit worker max-attempts cap", () => {
    const env = resolveBriterEnv({
      BRITER_APP_ROOT: "/workspace/briter",
      BRITER_WORKER_MAX_ATTEMPTS: "3",
    });

    expect(env.workerMaxAttempts).toBe(3);
  });

  test("respects explicit overrides", () => {
    const env = resolveBriterEnv({
      BRITER_APP_ROOT: "/workspace/briter",
      BRITER_CONTENT_ROOT: "/repo/notes",
      BRITER_UPLOAD_ROOT: "/repo/uploads",
      BRITER_QUEUE_ROOT: "/repo/queue",
      BRITER_GIT_BRANCH: "prod",
      BRITER_WORKER_DRY_RUN: "0",
    });

    expect(env.contentRoot).toBe("/repo/notes");
    expect(env.uploadRoot).toBe("/repo/uploads");
    expect(env.queueRoot).toBe("/repo/queue");
    expect(env.gitBranch).toBe("prod");
    expect(env.workerDryRun).toBe(false);
  });
});
