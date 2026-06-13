import { join } from "node:path";

export type BriterPaths = {
  appRoot: string;
  storageRoot: string;
  configFile: string;
  secretsFile: string;
  contentRoot: string;
  sectionsRoot: string;
  uploadRoot: string;
  queueRoot: string;
};

export function resolveBriterPaths(appRoot: string): BriterPaths {
  const storageRoot = join(appRoot, "storage");

  return {
    appRoot,
    storageRoot,
    configFile: join(storageRoot, "config.json"),
    secretsFile: join(storageRoot, "secrets.json"),
    contentRoot: join(appRoot, "content/posts"),
    // Section definition JSON lives alongside posts under content/ so it rides
    // the existing `^content/` git-sync whitelist (see adapters).
    sectionsRoot: join(appRoot, "content/sections"),
    uploadRoot: join(storageRoot, "uploads/posts"),
    queueRoot: join(storageRoot, "queue"),
  };
}
