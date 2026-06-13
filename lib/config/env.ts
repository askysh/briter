import { join } from "node:path";
import type { RuntimeConfig } from "@/lib/config/runtime-config";

export type BriterEnv = RuntimeConfig & { appRoot: string };

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return !["0", "false", "no"].includes(value.toLowerCase());
}

export function resolveBriterEnv(
  source: Record<string, string | undefined> = process.env,
): BriterEnv {
  const appRoot = source.BRITER_APP_ROOT ?? process.cwd();

  return {
    appRoot,
    siteAdapterKey: source.BRITER_SITE_ADAPTER ?? "local-mdx",
    contentRoot: source.BRITER_CONTENT_ROOT ?? join(appRoot, "content/posts"),
    uploadRoot:
      source.BRITER_UPLOAD_ROOT ?? join(appRoot, "storage/uploads/posts"),
    queueRoot: source.BRITER_QUEUE_ROOT ?? join(appRoot, "storage/queue"),
    gitWorktreeRoot: source.BRITER_GIT_WORKTREE ?? appRoot,
    gitBranch: source.BRITER_GIT_BRANCH ?? "main",
    gitRemote: source.BRITER_GIT_REMOTE ?? "origin",
    gitAuthorName: source.BRITER_GIT_AUTHOR_NAME ?? "Briter",
    gitAuthorEmail:
      source.BRITER_GIT_AUTHOR_EMAIL ?? "briter@example.invalid",
    publicBaseUrl: source.BRITER_PUBLIC_BASE_URL ?? "http://localhost:3075",
    uploadRouteBase: source.BRITER_UPLOAD_ROUTE_BASE ?? "/uploads",
    workerDryRun: parseBoolean(source.BRITER_WORKER_DRY_RUN, true),
    workerPollIntervalMs: Number.parseInt(
      source.BRITER_WORKER_POLL_INTERVAL_MS ?? "5000",
      10,
    ),
    workerMaxAttempts: Number.parseInt(
      source.BRITER_WORKER_MAX_ATTEMPTS ?? "8",
      10,
    ),
    uploadStorageLimitBytes: Number.parseInt(
      source.BRITER_UPLOAD_STORAGE_LIMIT_BYTES ??
        String(500 * 1024 * 1024),
      10,
    ),
    siteName: source.BRITER_SITE_NAME ?? "Briter",
    siteDescription:
      source.BRITER_SITE_DESCRIPTION ?? "A small, opinionated writing app.",
    siteAuthor: source.BRITER_SITE_AUTHOR ?? "Writer",
    publishedHrefTemplate: source.BRITER_PUBLISHED_HREF_TEMPLATE ?? "",
    configured: source.BRITER_CONFIGURED === "1",
  };
}
