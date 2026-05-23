import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import { getOrCreateSessionSecret } from "@/lib/auth/session-secret";

type SessionPayload = {
  iat: number;
};

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function createSessionToken(): Promise<string> {
  const secret = await getOrCreateSessionSecret();
  const payload: SessionPayload = { iat: Date.now() };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

export async function verifySessionToken(
  token: string,
  now = Date.now(),
): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  const secret = await getOrCreateSessionSecret();
  const expected = sign(payload, secret);

  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return false;
    }

    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;
    if (typeof parsed.iat !== "number") return false;

    return now - parsed.iat <= SESSION_MAX_AGE_MS;
  } catch {
    return false;
  }
}

export async function hasValidSessionCookie(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}
