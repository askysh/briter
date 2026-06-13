import { mkdir, open, readFile, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Filesystem worker lock with stale-lock recovery.
 *
 * The git-sync worker is single-flight: only one instance may run at a time.
 * The lock is a file containing the holder's PID. If a worker crashes it leaves
 * the file behind; without recovery that would permanently wedge every future
 * sync. acquire() therefore reclaims a lock whose holder is dead or whose file
 * is older than the staleness TTL.
 *
 * This logic lives here (not only in scripts/run-git-sync-worker.mjs) so the
 * reclaim behaviour is unit-testable without spawning a real process.
 */

export const DEFAULT_LOCK_STALE_MS = 60_000;

export type ProcessAliveCheck = (pid: number) => boolean;

/**
 * Default liveness check. `process.kill(pid, 0)` sends no signal but performs
 * the existence/permission check. EPERM means the process exists but is owned
 * by another user, which still counts as alive.
 */
export function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code === "EPERM";
  }
}

export type ReclaimableOptions = {
  staleMs?: number;
  now?: number;
  isAlive?: ProcessAliveCheck;
};

/**
 * Decide whether an existing lock file can be reclaimed: the holder is dead,
 * the lock is older than the staleness TTL, or the file is unreadable/garbage.
 */
export async function lockIsReclaimable(
  lockPath: string,
  options: ReclaimableOptions = {},
): Promise<boolean> {
  const staleMs = options.staleMs ?? DEFAULT_LOCK_STALE_MS;
  const now = options.now ?? Date.now();
  const isAlive = options.isAlive ?? isProcessAlive;

  let pid = Number.NaN;
  try {
    pid = Number.parseInt((await readFile(lockPath, "utf8")).trim(), 10);
  } catch {
    return true;
  }

  if (isAlive(pid)) {
    try {
      const { mtimeMs } = await stat(lockPath);
      return now - mtimeMs > staleMs;
    } catch {
      return true;
    }
  }

  return true;
}

export type AcquireOptions = ReclaimableOptions & { pid?: number };

/**
 * Acquire the lock, reclaiming a dead or stale holder. Returns true on success.
 */
export async function acquireLock(
  lockPath: string,
  options: AcquireOptions = {},
): Promise<boolean> {
  const pid = options.pid ?? process.pid;
  await mkdir(dirname(lockPath), { recursive: true });

  const write = async () => {
    const handle = await open(lockPath, "wx");
    await handle.writeFile(String(pid));
    await handle.close();
  };

  try {
    await write();
    return true;
  } catch {
    if (await lockIsReclaimable(lockPath, options)) {
      await rm(lockPath, { force: true });
      try {
        await write();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}
