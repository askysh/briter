import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { loadRuntimeConfig, saveRuntimeConfig, isFirstBoot } from "@/lib/config/runtime-config";

let appRoot: string;

beforeEach(async () => {
  appRoot = join(tmpdir(), `briter-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(join(appRoot, "storage"), { recursive: true });
});

afterEach(async () => {
  await rm(appRoot, { recursive: true, force: true });
});

describe("loadRuntimeConfig", () => {
  test("returns defaults when no config file exists", async () => {
    const config = await loadRuntimeConfig({ BRITER_APP_ROOT: appRoot });
    expect(config.siteName).toBe("Briter");
    expect(config.gitBranch).toBe("main");
    // workerDryRun default is true, but only populated from env or config file
    expect(config.configured).toBe(false);
    expect(config.siteAdapterKey).toBe("local-mdx");
    expect(config.publicBaseUrl).toBe("http://localhost:3075");
  });

  test("env vars override defaults", async () => {
    const config = await loadRuntimeConfig({
      BRITER_APP_ROOT: appRoot,
      BRITER_GIT_BRANCH: "prod",
      BRITER_WORKER_DRY_RUN: "false",
      BRITER_PUBLIC_BASE_URL: "https://example.com",
      BRITER_SITE_ADAPTER: "git-target",
    });
    expect(config.gitBranch).toBe("prod");
    expect(config.workerDryRun).toBe(false);
    expect(config.publicBaseUrl).toBe("https://example.com");
    expect(config.siteAdapterKey).toBe("git-target");
  });

  test("config file values take precedence over defaults but not env vars", async () => {
    const configFile = join(appRoot, "storage", "config.json");
    await writeFile(
      configFile,
      JSON.stringify({ siteName: "My Blog", siteDescription: "From file", configured: true }),
      "utf8",
    );

    const config = await loadRuntimeConfig({ BRITER_APP_ROOT: appRoot });
    expect(config.siteName).toBe("My Blog");
    expect(config.siteDescription).toBe("From file");
    expect(config.configured).toBe(true);
  });

  test("parseBoolean handles '0', 'false', 'no' as falsy", async () => {
    for (const val of ["0", "false", "no"]) {
      const config = await loadRuntimeConfig({
        BRITER_APP_ROOT: appRoot,
        BRITER_WORKER_DRY_RUN: val,
      });
      expect(config.workerDryRun).toBe(false);
    }
  });

  test("numeric parse falls back to default on invalid value", async () => {
    const config = await loadRuntimeConfig({
      BRITER_APP_ROOT: appRoot,
      BRITER_WORKER_POLL_INTERVAL_MS: "not-a-number",
    });
    expect(config.workerPollIntervalMs).toBe(5000);
  });

  test("malformed config file does not throw and uses defaults", async () => {
    const configFile = join(appRoot, "storage", "config.json");
    await writeFile(configFile, "{ invalid json", "utf8");
    const config = await loadRuntimeConfig({ BRITER_APP_ROOT: appRoot });
    expect(config.siteName).toBe("Briter");
    expect(config.configured).toBe(false);
  });
});

describe("saveRuntimeConfig", () => {
  test("persists siteName and configured; re-loading reflects the saved values", async () => {
    const saved = await saveRuntimeConfig({ siteName: "Patched", configured: true }, appRoot);
    expect(saved.siteName).toBe("Patched");
    expect(saved.configured).toBe(true);

    // Re-loading should reflect the saved value (siteName has no env override)
    const reloaded = await loadRuntimeConfig({ BRITER_APP_ROOT: appRoot });
    expect(reloaded.siteName).toBe("Patched");
    expect(reloaded.configured).toBe(true);
  });

  test("return value of saveRuntimeConfig reflects the patch immediately", async () => {
    const saved = await saveRuntimeConfig({ siteDescription: "Custom desc" }, appRoot);
    expect(saved.siteDescription).toBe("Custom desc");
    expect(saved.siteName).toBe("Briter"); // other defaults preserved
  });
});

describe("isFirstBoot", () => {
  test("returns true when no config file and no secrets file exist", async () => {
    const result = await isFirstBoot(appRoot);
    expect(result).toBe(true);
  });

  test("returns false when configured=true and adminPasswordHash is present", async () => {
    await saveRuntimeConfig({ configured: true }, appRoot);
    const secretsFile = join(appRoot, "storage", "secrets.json");
    await writeFile(
      secretsFile,
      JSON.stringify({ adminPasswordHash: "$2a$12$fakehash" }),
      "utf8",
    );
    const result = await isFirstBoot(appRoot);
    expect(result).toBe(false);
  });
});
