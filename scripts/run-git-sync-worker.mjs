#!/usr/bin/env node
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

import {
  DEFAULT_LOCK_STALE_MS,
  acquireLock as acquireWorkerLock,
} from "../lib/worker/lock-file.ts";

const appRoot = process.cwd();
const lockPath = join(appRoot, "storage", "worker.lock");
// A lock older than this is treated as abandoned even if its PID still appears
// alive (e.g. PID reuse). A crash must never permanently wedge future syncs.
const staleMs = Number.parseInt(
  process.env.BRITER_WORKER_LOCK_STALE_MS ?? String(DEFAULT_LOCK_STALE_MS),
  10,
);

async function releaseLock() {
  await rm(lockPath, { force: true });
}

const locked = await acquireWorkerLock(lockPath, { staleMs });
if (!locked) {
  console.log("[briter-worker] another worker instance is active, skipping");
  process.exit(0);
}

const once = process.env.BRITER_WORKER_RUN_ONCE === "1";

function runWorkerOnce() {
  return new Promise((resolve) => {
    const child = spawn("bun", ["run", "worker/index.ts"], {
      stdio: "inherit",
      env: { ...process.env, BRITER_WORKER_RUN_ONCE: "1" },
    });
    child.on("exit", () => resolve(undefined));
  });
}

try {
  await runWorkerOnce();
  if (!once) {
    setInterval(() => {
      void runWorkerOnce();
    }, 5000);
  }
} finally {
  if (once) {
    await releaseLock();
  }
}

process.on("SIGINT", async () => {
  await releaseLock();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await releaseLock();
  process.exit(0);
});
