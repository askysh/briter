import { statfsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

export type DiskUsage = {
  /** Total bytes on the filesystem that holds the given path. */
  totalBytes: number;
  /** Bytes available to a non-privileged process on that filesystem. */
  freeBytes: number;
  /** Bytes in use (total - free). */
  usedBytes: number;
};

/**
 * Sense the physical disk that backs `path` (content + uploads live here).
 *
 * Prefers Node's `fs.statfsSync` (available on modern Node). The path is
 * created if missing so statfs can resolve the mount. On any failure we return
 * null rather than throwing — disk sensing is informational, never fatal.
 */
export async function senseDiskUsage(path: string): Promise<DiskUsage | null> {
  try {
    await mkdir(path, { recursive: true });
    const stats = statfsSync(path);
    const totalBytes = stats.blocks * stats.bsize;
    const freeBytes = stats.bavail * stats.bsize;
    return {
      totalBytes,
      freeBytes,
      usedBytes: Math.max(0, totalBytes - freeBytes),
    };
  } catch {
    return null;
  }
}
