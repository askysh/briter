import { createHmac, timingSafeEqual } from "node:crypto";

import { getOrCreateSessionSecret } from "@/lib/auth/session-secret";

type PreviewTokenPayload = {
  slug: string;
  exp: number;
};

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function createPreviewToken(
  slug: string,
  ttlMs = 24 * 60 * 60 * 1000,
): Promise<string> {
  const secret = await getOrCreateSessionSecret();
  const payload: PreviewTokenPayload = {
    slug,
    exp: Date.now() + ttlMs,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

export async function verifyPreviewToken(
  token: string,
  expectedSlug: string,
): Promise<boolean> {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  const secret = await getOrCreateSessionSecret();
  const expected = sign(encoded, secret);
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  } catch {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as PreviewTokenPayload;
    if (payload.slug !== expectedSlug) return false;
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}
