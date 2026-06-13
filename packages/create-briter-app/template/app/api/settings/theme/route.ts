import { NextResponse } from "next/server";

import { requireAdmin, requireAdminMutation } from "@/lib/auth/require-admin";
import { resolveTheme } from "@/lib/theme/resolve";
import {
  loadThemeConfig,
  sanitizeThemeConfig,
  saveThemeConfig,
} from "@/lib/theme/store";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const config = await loadThemeConfig();
  return NextResponse.json({ config, resolved: resolveTheme(config) });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminMutation(request);
  if (unauthorized) return unauthorized;

  const payload = await request.json();
  const config = sanitizeThemeConfig(payload);
  await saveThemeConfig(config);
  return NextResponse.json({ ok: true, resolved: resolveTheme(config) });
}
