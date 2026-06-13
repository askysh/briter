import { NextResponse } from "next/server";
import * as OTPAuth from "otpauth";

import { enforceSameOrigin } from "@/lib/auth/csrf";
import { hashPassword } from "@/lib/auth/password";
import { loadRuntimeConfig, saveRuntimeConfig } from "@/lib/config/runtime-config";
import { saveSecrets } from "@/lib/config/secrets";
import { senseDiskUsage } from "@/lib/uploads/disk-usage";

const DEFAULT_PROVISIONED_CAP_BYTES = 500 * 1024 * 1024;
const MIN_PASSWORD_LENGTH = 10;

type SetupAction = "provision-totp" | "complete";

type SetupPayload = {
  action?: SetupAction;
  siteName?: string;
  siteDescription?: string;
  siteAuthor?: string;
  siteAdapterKey?: string;
  password?: string;
  enableTotp?: boolean;
  totpSecret?: string;
  totpCode?: string;
  uploadStorageLimitBytes?: number;
};

/**
 * Build a TOTP instance from a base32 secret. The label tracks the site name so
 * the entry the user sees in their authenticator is recognisable.
 */
function buildTotp(secret: string, siteName?: string) {
  return new OTPAuth.TOTP({
    issuer: "Briter",
    label: siteName?.trim() || "Briter Admin",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

function onlyAllowedAdapter(key: string | undefined): string {
  return key === "git-target" ? "git-target" : "local-mdx";
}

/**
 * Sense the data volume so the setup wizard can show the user real total/free
 * disk before they choose a provisioned cap. The upload root holds content +
 * uploads, so its filesystem is the volume that matters.
 */
export async function GET() {
  const config = await loadRuntimeConfig();
  const disk = await senseDiskUsage(config.uploadRoot);
  return NextResponse.json({
    disk,
    defaultCapBytes: DEFAULT_PROVISIONED_CAP_BYTES,
    minPasswordLength: MIN_PASSWORD_LENGTH,
  });
}

export async function POST(request: Request) {
  const forged = enforceSameOrigin(request);
  if (forged) return forged;

  const payload = (await request.json()) as SetupPayload;

  // Action: provision a fresh TOTP secret + otpauth URI WITHOUT persisting
  // anything. The wizard shows the QR/secret from this so the user can scan and
  // then prove a working code on the final `complete` step — they can never be
  // locked out by a mis-scanned secret because nothing is saved until verified.
  if (payload.action === "provision-totp") {
    const config = await loadRuntimeConfig();
    if (config.configured) {
      return NextResponse.json({ error: "Already configured." }, { status: 409 });
    }
    const totpSecret = new OTPAuth.Secret().base32;
    const totpUri = buildTotp(totpSecret, payload.siteName).toString();
    return NextResponse.json({ ok: true, totpSecret, totpUri });
  }

  const config = await loadRuntimeConfig();
  if (config.configured) {
    return NextResponse.json({ error: "Already configured." }, { status: 409 });
  }

  if (!payload.password || payload.password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
  }

  let totpSecret: string | undefined;

  if (payload.enableTotp) {
    totpSecret = payload.totpSecret;
    if (!totpSecret) {
      return NextResponse.json(
        { error: "Two-factor was enabled but no secret was provisioned." },
        { status: 400 },
      );
    }
    // Require a valid code so a mis-scanned authenticator can't lock the admin
    // out. The secret is only persisted once a live code verifies against it.
    const totp = buildTotp(totpSecret, payload.siteName);
    const valid = totp.validate({ token: payload.totpCode ?? "", window: 1 });
    if (valid === null) {
      return NextResponse.json(
        { error: "That code didn't match. Check your authenticator and try again." },
        { status: 400 },
      );
    }
  }

  const passwordHash = await hashPassword(payload.password);

  const provisionedCapBytes =
    typeof payload.uploadStorageLimitBytes === "number" &&
    Number.isFinite(payload.uploadStorageLimitBytes) &&
    payload.uploadStorageLimitBytes > 0
      ? Math.floor(payload.uploadStorageLimitBytes)
      : DEFAULT_PROVISIONED_CAP_BYTES;

  await saveRuntimeConfig({
    configured: true,
    siteName: payload.siteName || "Briter",
    siteDescription: payload.siteDescription || "",
    siteAuthor: payload.siteAuthor || "",
    siteAdapterKey: onlyAllowedAdapter(payload.siteAdapterKey),
    uploadStorageLimitBytes: provisionedCapBytes,
  });
  // Secrets (password hash + optional TOTP secret) never touch config.json or
  // logs — saveSecrets writes storage/secrets.json with 0600 permissions.
  await saveSecrets({ adminPasswordHash: passwordHash, totpSecret });

  return NextResponse.json({ ok: true, totpEnabled: Boolean(totpSecret) });
}
