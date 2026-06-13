import { mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export async function computeDirectorySize(root: string): Promise<number> {
  await mkdir(root, { recursive: true });
  const entries = await readdir(root, { withFileTypes: true });
  const sizes = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(root, entry.name);
      if (entry.isDirectory()) {
        return computeDirectorySize(fullPath);
      }
      if (entry.isFile()) {
        return (await stat(fullPath)).size;
      }
      return 0;
    }),
  );
  return sizes.reduce((sum, size) => sum + size, 0);
}

export function isNearCapacity(usedBytes: number, capBytes: number): boolean {
  return usedBytes >= Math.floor(capBytes * 0.95);
}
