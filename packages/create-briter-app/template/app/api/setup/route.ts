import { NextResponse } from "next/server";
import * as OTPAuth from "otpauth";

import { enforceSameOrigin } from "@/lib/auth/csrf";
import { hashPassword } from "@/lib/auth/password";
import { loadRuntimeConfig, saveRuntimeConfig } from "@/lib/config/runtime-config";
import { saveSecrets } from "@/lib/config/secrets";
import { senseDiskUsage } from "@/lib/uploads/disk-usage";

const DEFAULT_PROVISIONED_CAP_BYTES = 500 * 1024 * 1024;

type SetupPayload = {
  siteName: string;
  siteDescription?: string;
  siteAuthor?: string;
  password: string;
  enableTotp?: boolean;
  totpSecret?: string;
  uploadStorageLimitBytes?: number;
};

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
  });
}

export async function POST(request: Request) {
  const forged = enforceSameOrigin(request);
  if (forged) return forged;

  const payload = (await request.json()) as SetupPayload;
  const config = await loadRuntimeConfig();
  if (config.configured) {
    return NextResponse.json({ error: "Already configured." }, { status: 409 });
  }

  if (!payload.password || payload.password.length < 10) {
    return NextResponse.json(
      { error: "Password must be at least 10 characters." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(payload.password);
  let totpSecret: string | undefined;
  let totpUri: string | undefined;

  if (payload.enableTotp) {
    totpSecret = payload.totpSecret || new OTPAuth.Secret().base32;
    const totp = new OTPAuth.TOTP({
      issuer: "Briter",
      label: payload.siteName || "Briter Admin",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(totpSecret),
    });
    totpUri = totp.toString();
  }

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
    uploadStorageLimitBytes: provisionedCapBytes,
  });
  await saveSecrets({ adminPasswordHash: passwordHash, totpSecret });

  return NextResponse.json({ ok: true, totpUri, totpSecret });
}
