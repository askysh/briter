import { NextResponse } from "next/server";
import * as OTPAuth from "otpauth";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import { isRateLimited } from "@/lib/auth/rate-limit";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken } from "@/lib/auth/session";
import { loadSecrets } from "@/lib/config/secrets";

type LoginPayload = {
  password: string;
  totpCode?: string;
};

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const payload = (await request.json()) as LoginPayload;
  const secrets = await loadSecrets();
  if (!secrets.adminPasswordHash) {
    return NextResponse.json({ error: "Setup is incomplete." }, { status: 409 });
  }

  const ok = await verifyPassword(payload.password, secrets.adminPasswordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  if (secrets.totpSecret) {
    const totp = new OTPAuth.TOTP({
      issuer: "Briter",
      label: "Briter Admin",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secrets.totpSecret),
    });
    const valid = totp.validate({
      token: payload.totpCode ?? "",
      window: 1,
    });
    if (valid === null) {
      return NextResponse.json({ error: "Invalid TOTP code." }, { status: 401 });
    }
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
