import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { acquireLock, lockIsReclaimable } from "@/lib/worker/lock-file";

let tempRoot = "";

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  }
});

const alive = () => true;
const dead = () => false;

describe("worker lock-file", () => {
  test("acquires a lock when none exists", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-lock-"));
    const lockPath = join(tempRoot, "worker.lock");

    const ok = await acquireLock(lockPath, { pid: 4242, isAlive: alive });

    expect(ok).toBe(true);
    expect((await readFile(lockPath, "utf8")).trim()).toBe("4242");
  });

  test("refuses to acquire when a live, fresh holder owns the lock", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-lock-"));
    const lockPath = join(tempRoot, "worker.lock");
    await writeFile(lockPath, "111", "utf8");

    const ok = await acquireLock(lockPath, { pid: 222, isAlive: alive });

    expect(ok).toBe(false);
    // Existing holder's pid is untouched.
    expect((await readFile(lockPath, "utf8")).trim()).toBe("111");
  });

  test("reclaims a lock whose holder is dead (crash recovery)", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-lock-"));
    const lockPath = join(tempRoot, "worker.lock");
    // Simulate a crashed worker: lock file left behind, pid no longer alive.
    await writeFile(lockPath, "999", "utf8");

    const ok = await acquireLock(lockPath, { pid: 555, isAlive: dead });

    expect(ok).toBe(true);
    expect((await readFile(lockPath, "utf8")).trim()).toBe("555");
  });

  test("reclaims a stale lock even if the pid appears alive (pid reuse)", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-lock-"));
    const lockPath = join(tempRoot, "worker.lock");
    await writeFile(lockPath, "111", "utf8");
    // Backdate the lock file well beyond the staleness TTL.
    const old = new Date(Date.now() - 10 * 60_000);
    await utimes(lockPath, old, old);

    const reclaimable = await lockIsReclaimable(lockPath, {
      staleMs: 60_000,
      isAlive: alive,
    });
    expect(reclaimable).toBe(true);

    const ok = await acquireLock(lockPath, {
      pid: 222,
      staleMs: 60_000,
      isAlive: alive,
    });
    expect(ok).toBe(true);
    expect((await readFile(lockPath, "utf8")).trim()).toBe("222");
  });

  test("reclaims an unreadable/garbage lock file", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-lock-"));
    const lockPath = join(tempRoot, "worker.lock");
    await writeFile(lockPath, "not-a-pid", "utf8");

    // Uses the real liveness check, which rejects a non-numeric pid.
    const ok = await acquireLock(lockPath, { pid: 333 });

    expect(ok).toBe(true);
    expect((await readFile(lockPath, "utf8")).trim()).toBe("333");
  });

  test("kill/restart cycle: dead holder is reclaimed without manual cleanup", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "briter-lock-"));
    const lockPath = join(tempRoot, "worker.lock");

    // Worker A acquires.
    expect(await acquireLock(lockPath, { pid: 1000, isAlive: alive })).toBe(
      true,
    );
    await stat(lockPath); // lock exists

    // Worker A is killed mid-run -> lock file remains, pid 1000 now dead.
    // Worker B starts and must resume with no manual lock cleanup.
    const ok = await acquireLock(lockPath, {
      pid: 2000,
      isAlive: (pid) => pid !== 1000,
    });

    expect(ok).toBe(true);
    expect((await readFile(lockPath, "utf8")).trim()).toBe("2000");
  });
});
