import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { resolveBriterPaths } from "@/lib/config/paths";

export type BriterSecrets = {
  adminPasswordHash?: string;
  sessionSecret?: string;
  totpSecret?: string;
};

function appRootForResolve(appRoot?: string) {
  return appRoot ?? process.cwd();
}

export async function loadSecrets(appRoot?: string): Promise<BriterSecrets> {
  const paths = resolveBriterPaths(appRootForResolve(appRoot));

  try {
    const raw = await readFile(paths.secretsFile, "utf8");
    return JSON.parse(raw) as BriterSecrets;
  } catch {
    return {};
  }
}

export async function saveSecrets(
  patch: Partial<BriterSecrets>,
  appRoot?: string,
): Promise<BriterSecrets> {
  const root = appRootForResolve(appRoot);
  const paths = resolveBriterPaths(root);
  const current = await loadSecrets(root);
  const next = { ...current, ...patch };
  const payload = JSON.stringify(next, null, 2);

  await mkdir(dirname(paths.secretsFile), { recursive: true });
  await writeFile(paths.secretsFile, payload, "utf8");
  try {
    await chmod(paths.secretsFile, 0o600);
  } catch {
    // best-effort on non-POSIX
  }

  return next;
}
