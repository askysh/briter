import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as OTPAuth from "otpauth";

import { POST } from "./route";
import { loadRuntimeConfig } from "@/lib/config/runtime-config";
import { loadSecrets } from "@/lib/config/secrets";

let appRoot: string;

beforeEach(async () => {
  appRoot = join(tmpdir(), `briter-setup-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(join(appRoot, "storage"), { recursive: true });
  // The route resolves storage paths from cwd, so point cwd at the temp root.
  process.chdir(appRoot);
});

afterEach(async () => {
  process.chdir(tmpdir());
  await rm(appRoot, { recursive: true, force: true });
});

// Same-origin: the route's enforceSameOrigin trusts a request whose Origin
// matches its own Host. Build requests that satisfy that.
function setupRequest(body: unknown): Request {
  return new Request("http://localhost/api/setup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost",
      host: "localhost",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/setup", () => {
  test("rejects a password shorter than the minimum", async () => {
    const res = await POST(setupRequest({ action: "complete", password: "short" }));
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error?: string };
    expect(data.error).toContain("at least");
  });

  test("persists site fields, adapter choice, and a hashed password", async () => {
    const res = await POST(
      setupRequest({
        action: "complete",
        siteName: "My Blog",
        siteAuthor: "Ada",
        siteAdapterKey: "git-target",
        password: "correct-horse-battery",
        uploadStorageLimitBytes: 64 * 1024 * 1024,
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok?: boolean };
    expect(data.ok).toBe(true);

    const config = await loadRuntimeConfig({ BRITER_APP_ROOT: appRoot });
    expect(config.configured).toBe(true);
    expect(config.siteName).toBe("My Blog");
    expect(config.siteAdapterKey).toBe("git-target");
    expect(config.uploadStorageLimitBytes).toBe(64 * 1024 * 1024);

    const secrets = await loadSecrets(appRoot);
    expect(secrets.adminPasswordHash).toBeTruthy();
    expect(secrets.adminPasswordHash).not.toContain("correct-horse-battery");
    expect(secrets.totpSecret).toBeUndefined();
  });

  test("falls back to local-mdx for an unknown adapter key", async () => {
    await POST(
      setupRequest({
        action: "complete",
        siteName: "X",
        siteAdapterKey: "something-else",
        password: "correct-horse-battery",
      }),
    );
    const config = await loadRuntimeConfig({ BRITER_APP_ROOT: appRoot });
    expect(config.siteAdapterKey).toBe("local-mdx");
  });

  test("never writes secrets into config.json", async () => {
    await POST(
      setupRequest({
        action: "complete",
        siteName: "X",
        password: "correct-horse-battery",
      }),
    );
    const raw = await readFile(join(appRoot, "storage", "config.json"), "utf8");
    expect(raw).not.toContain("correct-horse-battery");
    expect(raw).not.toContain("adminPasswordHash");
    expect(raw).not.toContain("totpSecret");
  });

  test("provision-totp returns a secret + uri without persisting anything", async () => {
    const res = await POST(setupRequest({ action: "provision-totp", siteName: "My Blog" }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { totpSecret?: string; totpUri?: string };
    expect(data.totpSecret).toBeTruthy();
    expect(data.totpUri).toContain("otpauth://");

    // Nothing committed yet.
    const config = await loadRuntimeConfig({ BRITER_APP_ROOT: appRoot });
    expect(config.configured).toBe(false);
    const secrets = await loadSecrets(appRoot);
    expect(secrets.totpSecret).toBeUndefined();
  });

  test("rejects completion when TOTP is on but the code is invalid", async () => {
    const provision = await POST(setupRequest({ action: "provision-totp" }));
    const { totpSecret } = (await provision.json()) as { totpSecret: string };

    const res = await POST(
      setupRequest({
        action: "complete",
        siteName: "X",
        password: "correct-horse-battery",
        enableTotp: true,
        totpSecret,
        totpCode: "000000",
      }),
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error?: string };
    expect(data.error).toContain("code");

    const config = await loadRuntimeConfig({ BRITER_APP_ROOT: appRoot });
    expect(config.configured).toBe(false);
  });

  test("completes with TOTP when a valid code is supplied and stores the secret", async () => {
    const provision = await POST(setupRequest({ action: "provision-totp" }));
    const { totpSecret } = (await provision.json()) as { totpSecret: string };

    const totp = new OTPAuth.TOTP({
      issuer: "Briter",
      label: "Briter Admin",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(totpSecret),
    });

    const res = await POST(
      setupRequest({
        action: "complete",
        siteName: "X",
        password: "correct-horse-battery",
        enableTotp: true,
        totpSecret,
        totpCode: totp.generate(),
      }),
    );
    expect(res.status).toBe(200);

    const secrets = await loadSecrets(appRoot);
    expect(secrets.totpSecret).toBe(totpSecret);
    const config = await loadRuntimeConfig({ BRITER_APP_ROOT: appRoot });
    expect(config.configured).toBe(true);
  });

  test("refuses to reconfigure an already-configured instance", async () => {
    await POST(
      setupRequest({ action: "complete", siteName: "X", password: "correct-horse-battery" }),
    );
    const res = await POST(
      setupRequest({ action: "complete", siteName: "Y", password: "another-long-pass" }),
    );
    expect(res.status).toBe(409);
  });
});
