import type { SiteAdapter } from "@/lib/adapters/site-adapter";

export function validatePaths(paths: string[], adapter: SiteAdapter): string[] {
  const allowlist = adapter.getAllowedPaths();
  return paths.filter((path) => allowlist.some((pattern) => pattern.test(path)));
}
