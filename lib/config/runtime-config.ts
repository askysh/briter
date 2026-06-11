import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { resolveBriterPaths } from "@/lib/config/paths";
import { loadSecrets } from "@/lib/config/secrets";

export type RuntimeConfig = {
  appRoot: string;
  siteAdapterKey: string;
  contentRoot: string;
  uploadRoot: string;
  queueRoot: string;
  gitWorktreeRoot: string;
  gitBranch: string;
  gitRemote: string;
  gitAuthorName: string;
  gitAuthorEmail: string;
  publicBaseUrl: string;
  uploadRouteBase: string;
  workerDryRun: boolean;
  workerPollIntervalMs: number;
  uploadStorageLimitBytes: number;
  siteName: string;
  siteDescription: string;
  siteAuthor: string;
  publishedHrefTemplate: string;
  configured: boolean;
};

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return !["0", "false", "no"].includes(value.toLowerCase());
}

function parseNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function defaults(appRoot: string): RuntimeConfig {
  const paths = resolveBriterPaths(appRoot);
  return {
    appRoot,
    siteAdapterKey: "local-mdx",
    contentRoot: paths.contentRoot,
    uploadRoot: paths.uploadRoot,
    queueRoot: paths.queueRoot,
    gitWorktreeRoot: appRoot,
    gitBranch: "main",
    gitRemote: "origin",
    gitAuthorName: "Briter",
    gitAuthorEmail: "briter@example.invalid",
    publicBaseUrl: "http://localhost:3075",
    uploadRouteBase: "/uploads",
    workerDryRun: true,
    workerPollIntervalMs: 5000,
    uploadStorageLimitBytes: 500 * 1024 * 1024,
    siteName: "Briter",
    siteDescription: "A small, opinionated writing app.",
    siteAuthor: "Writer",
    publishedHrefTemplate: "",
    configured: false,
  };
}

type PartialRuntime = Partial<RuntimeConfig>;

async function readConfigFile(filePath: string): Promise<PartialRuntime> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as PartialRuntime;
  } catch {
    return {};
  }
}

export async function loadRuntimeConfig(
  source: Record<string, string | undefined> = process.env,
): Promise<RuntimeConfig> {
  const appRoot = source.BRITER_APP_ROOT ?? process.cwd();
  const base = defaults(appRoot);
  const paths = resolveBriterPaths(appRoot);
  const fileConfig = await readConfigFile(paths.configFile);
  const envConfig: PartialRuntime = {
    siteAdapterKey: source.BRITER_SITE_ADAPTER,
    contentRoot: source.BRITER_CONTENT_ROOT,
    uploadRoot: source.BRITER_UPLOAD_ROOT,
    queueRoot: source.BRITER_QUEUE_ROOT,
    gitWorktreeRoot: source.BRITER_GIT_WORKTREE,
    gitBranch: source.BRITER_GIT_BRANCH,
    gitRemote: source.BRITER_GIT_REMOTE,
    gitAuthorName: source.BRITER_GIT_AUTHOR_NAME,
    gitAuthorEmail: source.BRITER_GIT_AUTHOR_EMAIL,
    publicBaseUrl: source.BRITER_PUBLIC_BASE_URL,
    uploadRouteBase: source.BRITER_UPLOAD_ROUTE_BASE,
    workerDryRun: source.BRITER_WORKER_DRY_RUN
      ? parseBoolean(source.BRITER_WORKER_DRY_RUN, base.workerDryRun)
      : undefined,
    workerPollIntervalMs: source.BRITER_WORKER_POLL_INTERVAL_MS
      ? parseNumber(source.BRITER_WORKER_POLL_INTERVAL_MS, base.workerPollIntervalMs)
      : undefined,
    uploadStorageLimitBytes: source.BRITER_UPLOAD_STORAGE_LIMIT_BYTES
      ? parseNumber(
          source.BRITER_UPLOAD_STORAGE_LIMIT_BYTES,
          base.uploadStorageLimitBytes,
        )
      : undefined,
    publishedHrefTemplate: source.BRITER_PUBLISHED_HREF_TEMPLATE,
  };

  // Spreading raw envConfig would clobber base/file values with `undefined`
  // for unset env vars (e.g. uploadStorageLimitBytes became NaN downstream).
  const definedEnvConfig = Object.fromEntries(
    Object.entries(envConfig).filter(([, value]) => value !== undefined),
  ) as PartialRuntime;

  const merged = {
    ...base,
    ...fileConfig,
    ...definedEnvConfig,
    appRoot,
    configured: Boolean(fileConfig.configured),
  };

  return {
    ...merged,
    workerPollIntervalMs: merged.workerPollIntervalMs || base.workerPollIntervalMs,
    uploadStorageLimitBytes:
      merged.uploadStorageLimitBytes || base.uploadStorageLimitBytes,
    contentRoot: merged.contentRoot || base.contentRoot,
    uploadRoot: merged.uploadRoot || base.uploadRoot,
    queueRoot: merged.queueRoot || base.queueRoot,
    gitWorktreeRoot: merged.gitWorktreeRoot || base.gitWorktreeRoot,
    gitBranch: merged.gitBranch || base.gitBranch,
    gitRemote: merged.gitRemote || base.gitRemote,
    gitAuthorName: merged.gitAuthorName || base.gitAuthorName,
    gitAuthorEmail: merged.gitAuthorEmail || base.gitAuthorEmail,
    publicBaseUrl: merged.publicBaseUrl || base.publicBaseUrl,
    uploadRouteBase: merged.uploadRouteBase || base.uploadRouteBase,
    siteAdapterKey: merged.siteAdapterKey || base.siteAdapterKey,
    siteName: merged.siteName || base.siteName,
    siteDescription: merged.siteDescription || base.siteDescription,
    siteAuthor: merged.siteAuthor || base.siteAuthor,
    publishedHrefTemplate:
      merged.publishedHrefTemplate || base.publishedHrefTemplate,
  };
}

export async function saveRuntimeConfig(
  patch: Partial<RuntimeConfig>,
  appRoot?: string,
): Promise<RuntimeConfig> {
  const root = appRoot ?? process.cwd();
  const paths = resolveBriterPaths(root);
  const current = await loadRuntimeConfig({ BRITER_APP_ROOT: root });
  const next = { ...current, ...patch };
  await mkdir(dirname(paths.configFile), { recursive: true });
  await writeFile(paths.configFile, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function isFirstBoot(appRoot?: string): Promise<boolean> {
  const root = appRoot ?? process.cwd();
  const config = await loadRuntimeConfig({ BRITER_APP_ROOT: root });
  const secrets = await loadSecrets(root);
  return !config.configured || !secrets.adminPasswordHash;
}

export function configDocsRoot(appRoot: string): string {
  return join(appRoot, "docs");
}
