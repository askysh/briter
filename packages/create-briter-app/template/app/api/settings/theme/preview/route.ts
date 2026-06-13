import { NextResponse } from "next/server";

import { enforceSameOrigin } from "@/lib/auth/csrf";
import { resolveTheme } from "@/lib/theme/resolve";
import { sanitizeThemeConfig } from "@/lib/theme/store";

export async function POST(request: Request) {
  const forged = enforceSameOrigin(request);
  if (forged) return forged;

  const payload = await request.json();
  const config = sanitizeThemeConfig(payload);
  return NextResponse.json({ config, resolved: resolveTheme(config) });
}
