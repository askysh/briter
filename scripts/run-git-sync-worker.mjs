#!/usr/bin/env node
import { open, rm } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

const appRoot = process.cwd();
const lockPath = join(appRoot, "storage", "worker.lock");
let lockHandle;

async function acquireLock() {
  try {
    lockHandle = await open(lockPath, "wx");
    await lockHandle.writeFile(String(process.pid));
    return true;
  } catch {
    return false;
  }
}

async function releaseLock() {
  try {
    await lockHandle?.close();
  } catch {}
  await rm(lockPath, { force: true });
}

const locked = await acquireLock();
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
