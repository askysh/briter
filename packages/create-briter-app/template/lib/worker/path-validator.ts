import type { SiteAdapter } from "@/lib/adapters/site-adapter";

function isSafeRelativePath(path: string): boolean {
  if (path.startsWith("/") || path.startsWith("\\") || path.includes("\\")) {
    return false;
  }

  return path.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

export function validatePaths(paths: string[], adapter: SiteAdapter): string[] {
  const allowlist = adapter.getAllowedPaths();
  return paths.filter(
    (path) =>
      isSafeRelativePath(path) &&
      allowlist.some((pattern) => pattern.test(path)),
  );
}
