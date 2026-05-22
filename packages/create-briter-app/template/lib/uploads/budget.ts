import { mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export async function computeDirectorySize(root: string): Promise<number> {
  await mkdir(root, { recursive: true });
  const entries = await readdir(root);
  const stats = await Promise.all(entries.map((name) => stat(join(root, name))));
  return stats.reduce((sum, item) => sum + item.size, 0);
}

export function isNearCapacity(usedBytes: number, capBytes: number): boolean {
  return usedBytes >= Math.floor(capBytes * 0.95);
}
